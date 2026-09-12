import { View, Text, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";
import { ApiError } from "../../utils/api";
import { loginWithWeChat } from "../../utils/auth";
import { isLoggedIn } from "../../utils/session";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

export default function LoginPage() {
  const theme = usePageTheme();
  const [busy, setBusy] = useState(false);

  useDidShow(() => {
    if (isLoggedIn()) {
      Taro.switchTab({ url: "/pages/index/index" });
    }
  });

  async function onLogin() {
    if (busy) return;
    setBusy(true);
    try {
      await loginWithWeChat();
      Taro.switchTab({ url: "/pages/index/index" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "这一次没进去，稍后再试。";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className={`login ${theme.className}`}>
      <View className="login__mark" />
      <Text className="login__title">有点情绪</Text>
      <Text className="login__body">繁华之外的心灵净土，让灵魂慢一点，让烦恼少一些</Text>
      <Button className="login__btn" onClick={onLogin}>
        {busy ? "在进去…" : "进入"}
      </Button>
      <Text className="login__hint">使用微信身份安全进入。</Text>
    </View>
  );
}
