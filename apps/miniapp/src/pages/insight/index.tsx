import { View, ScrollView } from "@tarojs/components";
import { PeriodInsight } from "../diary/insight";
import { usePageTheme } from "../../utils/theme";
import { useLiveDiary } from "../../utils/use-live-diary";
import "./index.scss";

export default function InsightPage() {
  const theme = usePageTheme();
  const { sessions, messages } = useLiveDiary();

  return (
    <View className={`diary ${theme.className}`}>
      <ScrollView className="diary__feed" scrollY>
        <PeriodInsight sessions={sessions} messages={messages} />
      </ScrollView>
    </View>
  );
}
