import { View, Text, Button, Image } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";
import {
  avatarInitial,
  avatarSrc,
  displayName,
  readLocalProfile,
  writeLocalProfile,
} from "../../utils/avatar";
import { pickAvatarImage, isPickCancel } from "../../utils/image";
import { clearSession, getUser, isLoggedIn } from "../../utils/session";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

export default function MinePage() {
  const theme = usePageTheme();
  const [name, setName] = useState(displayName(getUser()));
  const [face, setFace] = useState(avatarSrc(getUser()));

  function syncProfile() {
    const user = getUser();
    setName(displayName(user));
    setFace(avatarSrc(user));
  }

  useDidShow(() => {
    if (!isLoggedIn()) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    syncProfile();
  });

  async function onAvatar() {
    try {
      const url = await pickAvatarImage();
      const local = readLocalProfile();
      writeLocalProfile({ ...local, avatarDataUrl: url });
      syncProfile();
    } catch (err) {
      if (isPickCancel(err)) return;
      const message = err instanceof Error ? err.message : "头像换不了";
      Taro.showToast({ title: message.slice(0, 40), icon: "none" });
    }
  }

  function onPrivacy() {
    Taro.showModal({
      title: "隐私",
      content: "陪伴对话会记在账号里。点「就聊到这」收进的情绪日记和深度洞察先存在这台设备上；分析密钥只放在服务器。照片留在本机，发给倾听者的只有「附了一张图」。",
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
        <Button className="mine__avatar" aria-label="更换头像" onClick={() => void onAvatar()}>
          {face ? (
            <Image className="mine__avatar-img" src={face} mode="aspectFill" />
          ) : (
            <Text className="mine__avatar-mark">{avatarInitial(name)}</Text>
          )}
        </Button>
        <Text className="mine__name">{name}</Text>
        <Text className="mine__hint">点头像可更换。头像留在这台设备上。</Text>
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
