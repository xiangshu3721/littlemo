import { View, Text, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";
import { ApiError } from "../../utils/api";
import { loginWithWeChat } from "../../utils/auth";
import {
  LEGAL_INFO_DEFAULTS,
  LEGAL_INFO_PENDING,
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
  const [adultConfirmed, setAdultConfirmed] = useState(false);
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
    const missingDisclosure = [
      legalInfo.operatorName,
      legalInfo.privacyContact,
      legalInfo.complaintContact,
      legalInfo.complaintResponseTime,
      legalInfo.storageRegion,
      legalInfo.retentionDescription,
      legalInfo.miniProgramFiling,
    ].some((value) => !value || value.includes(LEGAL_INFO_PENDING));
    if (missingDisclosure) {
      Taro.showModal({
        title: "暂不能注册",
        content: "运营方尚未补齐主体、联系渠道、数据保存和备案信息。完成并核实后才会开放注册。",
        showCancel: false,
      });
      return;
    }
    if (legalInfo.ageScope === LEGAL_INFO_PENDING) {
      Taro.showModal({
        title: "暂不能注册",
        content: "运营方尚未确认本服务的适用年龄范围。完成年龄与未成年人保护设置前，暂不开放注册。",
        showCancel: false,
      });
      return;
    }
    if (legalInfo.ageScope !== "仅限年满18周岁" || !adultConfirmed) {
      Taro.showModal({
        title: "暂不开放注册",
        content: "当前版本只接受已确认年满18周岁的用户。运营方如需服务未成年人，须先完成未成年人模式和监护人保护流程。",
        showCancel: false,
      });
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

  return (
    <View className={`login ${theme.className}`}>
      <View className="login__mark" />
      <Text className="login__title">有点情绪</Text>
      <Text className="login__body">繁华之外的心灵净土，让灵魂慢一点，让烦恼少一些</Text>
      <Button className="login__btn" onClick={onLogin}>
        {busy ? "正在登录…" : "同意并登录"}
      </Button>
      <View className="login__agreements">
        {legalInfo.ageScope === "仅限年满18周岁" ? (
          <View className="login__agreement" onClick={() => setAdultConfirmed((value) => !value)}>
            <View className={`login__check${adultConfirmed ? " login__check--checked" : ""}`}>
              {adultConfirmed ? <Text>✓</Text> : null}
            </View>
            <Text className="login__agreement-copy">我确认已年满18周岁</Text>
          </View>
        ) : null}
        <View className="login__agreement" onClick={() => setAgreed((value) => !value)}>
          <View className={`login__check${agreed ? " login__check--checked" : ""}`}>
            {agreed ? <Text>✓</Text> : null}
          </View>
          <Text className="login__agreement-copy">我已阅读并同意</Text>
        </View>
        <View className="login__links">
          <Text onClick={() => Taro.navigateTo({ url: "/pages/legal/index?type=terms" })}>服务协议</Text>
          <Text className="login__separator">|</Text>
          <Text onClick={() => Taro.navigateTo({ url: "/pages/legal/index?type=privacy" })}>隐私政策</Text>
        </View>
        <View className="login__agreement login__agreement--sensitive" onClick={() => setSensitiveInfoAgreed((value) => !value)}>
          <View className={`login__check${sensitiveInfoAgreed ? " login__check--checked" : ""}`}>
            {sensitiveInfoAgreed ? <Text>✓</Text> : null}
          </View>
          <Text className="login__agreement-copy">我单独同意处理情绪、心理状态等敏感个人信息</Text>
        </View>
        <View className="login__links">
          <Text onClick={() => Taro.navigateTo({ url: "/pages/legal/index?type=sensitive" })}>查看说明</Text>
        </View>
      </View>
    </View>
  );
}
