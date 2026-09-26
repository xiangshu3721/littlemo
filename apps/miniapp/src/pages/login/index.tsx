import { View, Text, Button, Image } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";
import { ApiError } from "../../utils/api";
import { loginWithWeChat } from "../../utils/auth";
import {
  LEGAL_INFO_DEFAULTS,
  hasPendingPublicDisclosure,
  isPendingLegalValue,
  isProductionLegalGate,
  loadPublicLegalInfo,
  type PublicLegalInfo,
} from "../../utils/legal";
import { isLoggedIn } from "../../utils/session";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

export default function LoginPage() {
  const theme = usePageTheme();
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [sensitiveInfoAgreed, setSensitiveInfoAgreed] = useState(false);
  const [legalInfo, setLegalInfo] = useState<PublicLegalInfo>(LEGAL_INFO_DEFAULTS);
  const [legalLoading, setLegalLoading] = useState(true);

  useDidShow(() => {
    if (isLoggedIn()) {
      Taro.switchTab({ url: "/pages/index/index" });
      return;
    }
    setLegalLoading(true);
    void loadPublicLegalInfo()
      .then(setLegalInfo)
      .finally(() => setLegalLoading(false));
  });

  function openLegal(e: { stopPropagation: () => void }, type: "terms" | "privacy" | "sensitive") {
    e.stopPropagation();
    Taro.navigateTo({ url: `/pages/legal/index?type=${type}` });
  }

  async function onLogin() {
    if (busy) return;
    if (legalLoading) {
      Taro.showToast({ title: "正在读取服务说明，请稍后再试。", icon: "none" });
      return;
    }
    if (!agreed) {
      Taro.showToast({ title: "请先阅读并同意服务协议和隐私政策。", icon: "none" });
      return;
    }
    if (!sensitiveInfoAgreed) {
      Taro.showToast({ title: "请先阅读并单独确认敏感个人信息处理说明。", icon: "none" });
      return;
    }
    if (isProductionLegalGate()) {
      if (hasPendingPublicDisclosure(legalInfo) || isPendingLegalValue(legalInfo.ageScope)) {
        Taro.showModal({
          title: "暂不能注册",
          content: "服务公示信息尚未补齐。完成主体、联系渠道、备案、数据保存和适用年龄公示后才会开放注册。",
          showCancel: false,
        });
        return;
      }
      if (legalInfo.ageScope !== "仅限年满18周岁") {
        Taro.showModal({
          title: "暂不开放注册",
          content: "当前版本只接受已确认年满18周岁的用户。",
          showCancel: false,
        });
        return;
      }
    }
    setBusy(true);
    try {
      await loginWithWeChat();
      Taro.switchTab({ url: "/pages/index/index" });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : typeof err === "object" && err && "errMsg" in err
              ? String((err as { errMsg?: string }).errMsg || "这一次没进去，稍后再试。")
              : "这一次没进去，稍后再试。";
      Taro.showToast({ title: message.slice(0, 40), icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className={`login ${theme.className}`}>
      <Image className="login__logo" src="/assets/logo.png" mode="aspectFit" />
      <Text className="login__title">有点情绪</Text>
      <Text className="login__body">繁华之外的心灵净土，让灵魂慢一点，让烦恼少一些</Text>
      <Button className="login__btn" onClick={onLogin}>
        {busy ? "正在登录…" : "同意并登录"}
      </Button>
      <View className="login__agreements">
        <View className="login__agreement" onClick={() => setAgreed((value) => !value)}>
          <View className={`login__check${agreed ? " login__check--checked" : ""}`}>
            {agreed ? <Text>✓</Text> : null}
          </View>
          <Text className="login__agreement-copy">
            我已阅读并同意
            <Text className="login__link" onClick={(e) => openLegal(e, "terms")}>
              《服务协议》
            </Text>
            和
            <Text className="login__link" onClick={(e) => openLegal(e, "privacy")}>
              《隐私政策》
            </Text>
            ，并确认已满18周岁
          </Text>
        </View>
        <View className="login__agreement" onClick={() => setSensitiveInfoAgreed((value) => !value)}>
          <View className={`login__check${sensitiveInfoAgreed ? " login__check--checked" : ""}`}>
            {sensitiveInfoAgreed ? <Text>✓</Text> : null}
          </View>
          <Text className="login__agreement-copy">
            我单独同意处理情绪等内容
            <Text className="login__link" onClick={(e) => openLegal(e, "sensitive")}>
              《说明》
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}
