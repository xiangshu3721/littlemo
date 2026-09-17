/* eslint-disable jsx-a11y/alt-text -- Taro Image has no cross-platform alt prop. */
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
import { clearLocalUserData } from "../../utils/diary-store";
import { ensurePrivacyAuthorized } from "../../utils/privacy";
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
  const [authed, setAuthed] = useState(isLoggedIn());
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
        setAuthed(false);
      }
    }
  }

  function isDataUrl(value: string) {
    return value.startsWith("data:image/");
  }

  useDidShow(() => {
    const ok = isLoggedIn();
    setAuthed(ok);
    if (!ok) return;
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

  async function beginEditName() {
    if (busy || savingNameRef.current) return;
    if (!(await ensurePrivacyAuthorized())) return;
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

  function showPrivacyFallback() {
    Taro.showModal({
      title: "隐私",
      content: "陪伴对话、情绪日记和深度洞察都会记在你的账号里。清掉这台设备上的小程序缓存，云端记录还在；重新登录后会再同步下来。分析密钥只放在服务器。照片留在本机，发给倾听者的只有「附了一张图」。",
      showCancel: false,
      confirmText: "知道了",
      confirmColor: "#5f6f52",
    });
  }

  function goLogin() {
    Taro.navigateTo({ url: "/pages/login/index" });
  }

  function openLegal(kind: "terms" | "privacy") {
    Taro.navigateTo({ url: `/pages/legal/index?kind=${kind}` });
  }

  function onPrivacy() {
    if (process.env.TARO_ENV === "weapp" && typeof Taro.openPrivacyContract === "function") {
      Taro.openPrivacyContract({ fail: showPrivacyFallback });
      return;
    }
    showPrivacyFallback();
  }

  function onLogout() {
    Taro.showModal({
      title: "退出",
      content: "退出后，这台设备上的登录状态会清掉。日记和对话仍留在账号云端。",
      confirmText: "退出",
      confirmColor: "#8a4a42",
      success: (res) => {
        if (!res.confirm) return;
        clearSession();
        setAuthed(false);
      },
    });
  }

  function onDeleteAccount() {
    Taro.showModal({
      title: "注销账号",
      content: "将永久删除云端对话、日记、洞察和资料，且无法恢复。",
      confirmText: "仍要注销",
      confirmColor: "#8a4a42",
      success: (res) => {
        if (!res.confirm) return;
        Taro.showModal({
          title: "确认注销",
          content: "这是最后一步。注销后同一微信再次进入会是空白账号。",
          confirmText: "确认注销",
          confirmColor: "#8a4a42",
          success: (again) => {
            if (!again.confirm) return;
            void deleteAccount();
          },
        });
      },
    });
  }

  async function deleteAccount() {
    if (busy) return;
    setBusy(true);
    try {
      const userId = getUser()?.id;
      await api("/api/me", { method: "DELETE" });
      if (userId) clearLocalUserData(userId);
      clearSession();
      setAuthed(false);
      Taro.showToast({ title: "已注销", icon: "none" });
    } catch (err) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : "账号没注销掉";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className={`mine ${theme.className}`}>
      <Text className="mine__mark">只陪这一刻</Text>
      {authed ? (
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
      ) : (
        <View className="mine__card">
          <Text className="mine__name">还没进入</Text>
          <Text className="mine__hint">先浏览日记和洞察也可以。记下心情前请进入并同意协议。</Text>
          <Button className="mine__login" onClick={goLogin}>
            进入
          </Button>
        </View>
      )}
      <Button className="mine__row mine__row--first" onClick={() => openLegal("terms")}>
        用户协议
      </Button>
      <Button className="mine__row" onClick={() => openLegal("privacy")}>
        隐私政策
      </Button>
      <Button className={`mine__row${authed ? "" : " mine__row--last"}`} onClick={onPrivacy}>
        微信隐私保护指引
      </Button>
      {authed ? (
        <>
          <Button className="mine__row" onClick={onLogout}>
            退出登录
          </Button>
          <Button className="mine__row mine__row--last mine__row--danger" onClick={onDeleteAccount}>
            注销账号
          </Button>
        </>
      ) : null}
      <Text className="mine__foot">
        这是情绪记录与文字陪伴，不是心理咨询或医疗建议。日记跟账号存在云端；清掉小程序缓存不会删掉已同步的记录。注销账号会永久删除云端数据。
      </Text>
    </View>
  );
}
