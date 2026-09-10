import { View, Text, Button, Image } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useMemo, useState } from "react";
import { api, ApiError } from "../../utils/api";
import { avatarSrcForDisplay, imagePathToAvatarDataUrl, shouldUseChooseAvatar } from "../../utils/avatar";
import { clearSession, getUser, isLoggedIn, saveUser, type SessionUser } from "../../utils/session";
import "./index.scss";

export default function MinePage() {
  const [name, setName] = useState("未登录");
  const [avatarSrc, setAvatarSrc] = useState("");
  const [avatarKey, setAvatarKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const nativeAvatar = useMemo(() => shouldUseChooseAvatar(), []);

  function showUser(user: SessionUser | null) {
    setName(user?.nickname || "有点情绪");
    const url = user?.avatar || "";
    setAvatarSrc(url ? avatarSrcForDisplay(url) : "");
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
      showUser(merged);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Taro.redirectTo({ url: "/pages/login/index" });
      }
    }
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
      showUser({ ...(current || { id: "", nickname: name, avatar: dataUrl }), avatar: dataUrl });
      setAvatarKey((n) => n + 1);
      const data = await api<{ user: SessionUser }>("/api/me", {
        method: "PATCH",
        data: { avatar: dataUrl },
      });
      saveUser(data.user);
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

  function onPrivacy() {
    Taro.showModal({
      title: "隐私",
      content: "陪伴对话会记在账号里。点「就聊到这」收进的情绪日记和深度洞察先存在这台设备上；分析密钥只放在服务器。",
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
    <View className="mine">
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
        <Text className="mine__name">{name}</Text>
      </View>
      <Button className="mine__row" onClick={onPrivacy}>
        隐私说明
      </Button>
      <Button className="mine__row mine__row--last" onClick={onLogout}>
        退出登录
      </Button>
      <Text className="mine__foot">点「就聊到这」后，深度洞察会出现在「情绪日记」。清掉小程序数据，本机日记也会一起消失。</Text>
    </View>
  );
}
