import { View, Text, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";
import { ApiError } from "../../utils/api";
import { loginWithWeChat } from "../../utils/auth";
import { AI_NOTICE, DISCLAIMER_SHORT } from "../../utils/legal";
import { openOfficialPrivacy } from "../../utils/privacy";
import { isLoggedIn } from "../../utils/session";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

export default function LoginPage() {
  const theme = usePageTheme();
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useDidShow(() => {
    if (isLoggedIn()) {
      Taro.switchTab({ url: "/pages/index/index" });
    }
  });

  function openLegal(topic: "terms" | "privacy" | "disclaimer") {
    if (topic === "privacy") {
      openOfficialPrivacy();
      return;
    }
    Taro.navigateTo({ url: `/pages/legal/index?topic=${topic}` });
  }

  async function onLogin() {
    if (busy) return;
    if (!agreed) {
      Taro.showToast({ title: "请先阅读并同意协议", icon: "none" });
      return;
    }
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

  function onSkip() {
    Taro.switchTab({ url: "/pages/index/index" });
  }

  return (
    <View className={`login ${theme.className}`}>
      <View className="login__mark" />
      <Text className="login__title">有点情绪</Text>
      <Text className="login__body">记下这一刻的情绪。可以先看看，登录后再同步到你的账号。</Text>
      <Text className="login__notice">{DISCLAIMER_SHORT}</Text>
      <Button
        className={`login__btn${agreed ? "" : " login__btn--disabled"}`}
        openType={agreed ? "agreePrivacyAuthorization" : undefined}
        onAgreePrivacyAuthorization={agreed ? () => void onLogin() : undefined}
        onClick={() => {
          if (!agreed) {
            Taro.showToast({ title: "请先阅读并同意协议", icon: "none" });
            return;
          }
          if (process.env.TARO_ENV !== "weapp") void onLogin();
        }}
      >
        {busy ? "在进去…" : "同意并登录"}
      </Button>
      <Button className="login__skip" onClick={onSkip}>
        先看看
      </Button>
      <View className="login__agree">
        <View className="login__check-wrap" onClick={() => setAgreed((v) => !v)}>
          <View className={`login__check${agreed ? " login__check--on" : ""}`} />
        </View>
        <Text className="login__agree-text">
          我已阅读并同意
          <Text className="login__link" onClick={() => openLegal("terms")}>
            《用户协议》
          </Text>
          和
          <Text className="login__link" onClick={() => openLegal("privacy")}>
            《隐私保护指引》
          </Text>
        </Text>
      </View>
      <Text className="login__hint">{AI_NOTICE}</Text>
    </View>
  );
}
