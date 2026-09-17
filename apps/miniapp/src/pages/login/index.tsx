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

function readAgreed() {
  try {
    return Taro.getStorageSync(AGREE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const theme = usePageTheme();
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(readAgreed);

  useDidShow(() => {
    if (isLoggedIn()) {
      Taro.switchTab({ url: "/pages/index/index" });
    }
  });

  function openLegal(kind: "terms" | "privacy") {
    Taro.navigateTo({ url: `/pages/legal/index?kind=${kind}` });
  }

  async function onLogin() {
    if (busy) return;
    if (!agreed) {
      Taro.showToast({ title: "请先阅读并同意用户协议和隐私政策", icon: "none" });
      return;
    }
    if (!(await ensurePrivacyAuthorized())) {
      Taro.showToast({ title: "请先同意隐私保护指引", icon: "none" });
      return;
    }
    setBusy(true);
    try {
      Taro.setStorageSync(AGREE_KEY, "1");
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
      <Text className="login__body">记下这一刻的心情。这是情绪记录与文字陪伴，不是心理咨询或医疗建议。</Text>
      <Button className="login__btn" onClick={() => void onLogin()}>
        {busy ? "在进去…" : "进入"}
      </Button>
      <View className="login__agree">
        <View
          className={`login__check ${agreed ? "login__check--on" : ""}`}
          onClick={() => setAgreed((v) => !v)}
        />
        <View className="login__agree-text">
          <Text className="login__agree-copy" onClick={() => setAgreed((v) => !v)}>
            已阅读并同意
          </Text>
          <Text className="login__link" onClick={() => openLegal("terms")}>
            《用户协议》
          </Text>
          <Text className="login__agree-copy">和</Text>
          <Text className="login__link" onClick={() => openLegal("privacy")}>
            《隐私政策》
          </Text>
        </View>
      </View>
      <Text className="login__hint">使用微信身份进入。也可先返回，浏览日记和洞察页。</Text>
    </View>
  );
}
