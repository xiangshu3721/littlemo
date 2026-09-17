import { View, Text, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";
import { ApiError } from "../../utils/api";
import { loginWithWeChat } from "../../utils/auth";
import { ensurePrivacyAuthorized } from "../../utils/privacy";
import { isLoggedIn } from "../../utils/session";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

const AGREE_KEY = "littlemo.agreedLegal";
const SENSITIVE_KEY = "littlemo.agreedSensitive";

function readFlag(key: string) {
  try {
    return Taro.getStorageSync(key) === "1";
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const theme = usePageTheme();
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(() => readFlag(AGREE_KEY));
  const [sensitive, setSensitive] = useState(() => readFlag(SENSITIVE_KEY));

  useDidShow(() => {
    if (isLoggedIn()) {
      Taro.switchTab({ url: "/pages/index/index" });
    }
  });

  function openLegal(kind: "terms" | "privacy" | "sensitive") {
    Taro.navigateTo({ url: `/pages/legal/index?kind=${kind}` });
  }

  async function onLogin() {
    if (busy) return;
    if (!agreed) {
      Taro.showToast({ title: "请先阅读并同意服务协议和隐私政策", icon: "none" });
      return;
    }
    if (!sensitive) {
      Taro.showToast({ title: "请单独同意处理敏感个人信息", icon: "none" });
      return;
    }
    if (!(await ensurePrivacyAuthorized())) {
      Taro.showToast({ title: "请先同意隐私保护指引", icon: "none" });
      return;
    }
    setBusy(true);
    try {
      Taro.setStorageSync(AGREE_KEY, "1");
      Taro.setStorageSync(SENSITIVE_KEY, "1");
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
      <Button className="login__btn" onClick={() => void onLogin()}>
        {busy ? "在进去…" : "同意并登录"}
      </Button>
      <View className="login__agreements">
        <View className="login__agree">
          <View
            className={`login__check ${agreed ? "login__check--on" : ""}`}
            onClick={() => setAgreed((v) => !v)}
          />
          <View className="login__agree-text">
            <Text className="login__agree-copy" onClick={() => setAgreed((v) => !v)}>
              我已阅读并同意
            </Text>
            <Text className="login__link" onClick={() => openLegal("terms")}>
              服务协议
            </Text>
            <Text className="login__agree-copy"> | </Text>
            <Text className="login__link" onClick={() => openLegal("privacy")}>
              隐私政策
            </Text>
          </View>
        </View>
        <View className="login__agree">
          <View
            className={`login__check ${sensitive ? "login__check--on" : ""}`}
            onClick={() => setSensitive((v) => !v)}
          />
          <View className="login__agree-text">
            <Text className="login__agree-copy" onClick={() => setSensitive((v) => !v)}>
              我单独同意处理情绪、心理状态等敏感个人信息
            </Text>
            <Text className="login__link" onClick={() => openLegal("sensitive")}>
              查看说明
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
