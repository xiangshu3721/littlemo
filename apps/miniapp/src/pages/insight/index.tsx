import { View, ScrollView, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { PeriodInsight } from "../diary/insight";
import { AI_NOTICE } from "../../utils/legal";
import { isLoggedIn } from "../../utils/session";
import { usePageTheme } from "../../utils/theme";
import { useLiveDiary } from "../../utils/use-live-diary";
import "./index.scss";

export default function InsightPage() {
  const theme = usePageTheme();
  const { sessions, messages } = useLiveDiary();

  return (
    <View className={`diary ${theme.className}`}>
      <ScrollView className="diary__feed" scrollY>
        {!isLoggedIn() ? (
          <View className="guest-banner" onClick={() => Taro.navigateTo({ url: "/pages/login/index" })}>
            <Text className="guest-banner__text">登录后可查看你的阶段规律。以下说明不是医疗建议。</Text>
          </View>
        ) : null}
        <Text className="insight__ai">{AI_NOTICE}</Text>
        <PeriodInsight sessions={sessions} messages={messages} />
      </ScrollView>
    </View>
  );
}
