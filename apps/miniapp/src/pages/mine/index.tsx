import { View, Text, Button, Image, Input } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../utils/api";
import {
  avatarSrcForDisplay,
  displayName,
  imagePathToAvatarDataUrl,
  NICKNAME_MAX,
  readLocalProfile,
  shouldUseChooseAvatar,
  writeLocalProfile,
} from "../../utils/avatar";
import { clearSession, getUser, isLoggedIn, saveUser, type SessionUser } from "../../utils/session";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

export default function MinePage() {
  const theme = usePageTheme();
  const [name, setName] = useState(displayName(getUser()));
  const [draftName, setDraftName] = useState(displayName(getUser()));
  const [editingName, setEditingName] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState("");
  const [avatarKey, setAvatarKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const savingNameRef = useRef(false);
  const editingNameRef = useRef(false);
  const nativeAvatar = useMemo(() => shouldUseChooseAvatar(), []);

  function showUser(user: SessionUser | null) {
    const next = displayName(user);
    setName(next);
    if (!editingNameRef.current) setDraftName(next);
    const url = user?.avatar || readLocalProfile().avatarDataUrl || "";
    setAvatarSrc(url ? avatarSrcForDisplay(url) : "");
  }

  function syncLocalFromUser(user: SessionUser) {
    const local = readLocalProfile();
    writeLocalProfile({
      ...local,
      nickname: user.nickname?.trim() || local.nickname,
      avatarDataUrl: user.avatar && isDataUrl(user.avatar) ? user.avatar : local.avatarDataUrl,
    });
  }

  async function refreshFromCloud() {
    try {
      const data = await api<{ user: SessionUser }>("/api/me");
      const local = getUser();
      const merged: SessionUser = {
        ...data.user,
        avatar: data.user.avatar || local?.avatar || null,
      };
      saveUser(merged);
      syncLocalFromUser(merged);
      showUser(merged);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Taro.redirectTo({ url: "/pages/login/index" });
      }
    }
  }

  function isDataUrl(value: string) {
    return value.startsWith("data:image/");
  }

  useDidShow(() => {
    if (!isLoggedIn()) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    showUser(getUser());
    void refreshFromCloud();
  });

  async function persistFromPath(filePath: string) {
    if (busy) return;
    setBusy(true);
    try {
      const dataUrl = await imagePathToAvatarDataUrl(filePath);
      const current = getUser();
      if (current) saveUser({ ...current, avatar: dataUrl });
      writeLocalProfile({ ...readLocalProfile(), avatarDataUrl: dataUrl });
      showUser({ ...(current || { id: "", nickname: name, avatar: dataUrl }), avatar: dataUrl });
      setAvatarKey((n) => n + 1);
      const data = await api<{ user: SessionUser }>("/api/me", {
        method: "PATCH",
        data: { avatar: dataUrl },
      });
      saveUser(data.user);
      syncLocalFromUser(data.user);
      showUser(data.user);
      setAvatarKey((n) => n + 1);
    } catch (err) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : "头像换不了";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  function onChooseAvatar(e: { detail?: { avatarUrl?: string } }) {
    const url = e.detail?.avatarUrl;
    if (url) void persistFromPath(url);
  }

  async function onPickFallback() {
    if (nativeAvatar || busy) return;
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
      });
      const path = res.tempFilePaths?.[0];
      if (path) await persistFromPath(path);
    } catch {
      /* canceled */
    }
  }

  function beginEditName() {
    if (busy || savingNameRef.current) return;
    setDraftName(name);
    editingNameRef.current = true;
    setEditingName(true);
  }

  async function persistNickname(raw: string) {
    if (savingNameRef.current) return;
    const trimmed = String(raw || "").trim().slice(0, NICKNAME_MAX);
    if (!trimmed) {
      Taro.showToast({ title: "昵称不能为空", icon: "none" });
      setDraftName(name);
      editingNameRef.current = false;
      setEditingName(false);
      return;
    }
    if (trimmed === name) {
      editingNameRef.current = false;
      setEditingName(false);
      return;
    }
    if (busy) return;
    savingNameRef.current = true;
    setBusy(true);
    try {
      const current = getUser();
      const optimistic: SessionUser = {
        ...(current || { id: "", nickname: trimmed, avatar: null }),
        nickname: trimmed,
      };
      saveUser(optimistic);
      writeLocalProfile({ ...readLocalProfile(), nickname: trimmed });
      setName(trimmed);
      setDraftName(trimmed);
      editingNameRef.current = false;
      setEditingName(false);

      const data = await api<{ user: SessionUser }>("/api/me", {
        method: "PATCH",
        data: { nickname: trimmed },
      });
      saveUser(data.user);
      syncLocalFromUser(data.user);
      showUser(data.user);
      Taro.showToast({ title: "已保存", icon: "none" });
    } catch (err) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : "昵称没存上";
      Taro.showToast({ title: message, icon: "none" });
      showUser(getUser());
      editingNameRef.current = false;
      setEditingName(false);
    } finally {
      savingNameRef.current = false;
      setBusy(false);
    }
  }

  function onNameConfirm() {
    void persistNickname(draftName);
  }

  function onNameBlur() {
    void persistNickname(draftName);
  }

  function onPrivacy() {
    Taro.showModal({
      title: "隐私",
      content:
        "陪伴对话会记在账号里。点「就聊到这」收进的情绪日记和深度洞察先存在这台设备上；分析密钥只放在服务器。照片留在本机，发给倾听者的只有「附了一张图」。",
      showCancel: false,
      confirmText: "知道了",
      confirmColor: "#5f6f52",
    });
  }

  function onLogout() {
    Taro.showModal({
      title: "退出",
      content: "退出后，这台设备上的登录状态会清掉。记录仍留在云端。",
      confirmText: "退出",
      confirmColor: "#8a4a42",
      success: (res) => {
        if (!res.confirm) return;
        clearSession();
        Taro.redirectTo({ url: "/pages/login/index" });
      },
    });
  }

  return (
    <View className={`mine ${theme.className}`}>
      <Text className="mine__mark">只陪这一刻</Text>
      <View className="mine__card">
        <Button
          className={`mine__avatar-btn${busy ? " mine__avatar-btn--busy" : ""}`}
          openType={nativeAvatar ? "chooseAvatar" : undefined}
          onChooseAvatar={nativeAvatar ? onChooseAvatar : undefined}
          onClick={nativeAvatar ? undefined : onPickFallback}
          hoverClass="mine__avatar-btn--hover"
        >
          <View className="mine__avatar-wrap">
            {avatarSrc ? (
              <Image key={avatarKey} className="mine__avatar" src={avatarSrc} mode="aspectFill" />
            ) : (
              <View className="mine__avatar mine__avatar--empty">
                <Text className="mine__avatar-placeholder">头像</Text>
              </View>
            )}
            <View className="mine__avatar-badge" />
          </View>
          <Text className="mine__avatar-hint">{busy ? "在换…" : "点按更换"}</Text>
        </Button>
        {editingName ? (
          <Input
            className="mine__name-input"
            type="nickname"
            focus
            maxlength={NICKNAME_MAX}
            value={draftName}
            placeholder="怎么称呼你"
            placeholderClass="mine__name-placeholder"
            confirmType="done"
            onInput={(e) => setDraftName(String(e.detail.value || "").slice(0, NICKNAME_MAX))}
            onConfirm={onNameConfirm}
            onBlur={onNameBlur}
          />
        ) : (
          <View className="mine__name-row" onClick={beginEditName}>
            <Text className="mine__name">{name}</Text>
            <Text className="mine__name-edit">改</Text>
          </View>
        )}
        <Text className="mine__hint">点昵称或头像可更换，会保存到账号。</Text>
      </View>
      <Button className="mine__row" onClick={onPrivacy}>
        隐私说明
      </Button>
      <Button className="mine__row mine__row--last" onClick={onLogout}>
        退出登录
      </Button>
      <Text className="mine__foot">
        昵称与头像可随时改，保存后跟着账号走。点「就聊到这」后，深度洞察会出现在「情绪日记」。清掉小程序数据，本机日记也会一起消失。
      </Text>
    </View>
  );
}
