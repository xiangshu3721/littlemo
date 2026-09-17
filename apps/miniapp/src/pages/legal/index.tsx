import { ScrollView, Text, View } from "@tarojs/components";
import Taro, { useLoad, useRouter } from "@tarojs/taro";
import { isLegalTopic, LEGAL_BODIES, LEGAL_TITLES } from "../../utils/legal";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

export default function LegalPage() {
  const theme = usePageTheme();
  const router = useRouter();
  const topic = isLegalTopic(router.params.topic) ? router.params.topic : "terms";

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: LEGAL_TITLES[topic] });
  });

  return (
    <View className={`legal ${theme.className}`}>
      <ScrollView className="legal__feed" scrollY>
        <Text className="legal__title">{LEGAL_TITLES[topic]}</Text>
        <Text className="legal__body">{LEGAL_BODIES[topic]}</Text>
      </ScrollView>
    </View>
  );
}
