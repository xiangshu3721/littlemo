import { Button, Text, View } from "@tarojs/components";
import Taro, { useDidShow, useRouter } from "@tarojs/taro";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

const TERMS = [
  "「有点情绪」提供情绪记录、陪伴对话和阶段回顾。这是生活记录与文字陪伴，不是心理咨询、心理治疗或医疗建议，也不能替代专业帮助。",
  "进入后，我们使用微信身份（openid）建立账号，把对话、日记段落和阶段洞察存在云端，方便你换设备后继续看。头像和昵称只有在你主动填写时才会保存。聊天里选的照片默认留在本机，发给陪伴服务的只有「附了一张图」。",
  "陪伴回复由服务端调用的语言模型生成。模型会读你写下的文字以生成回复，密钥只放在服务器。",
  "请勿发布违法、侵权、淫秽或骚扰他人的内容。我们会按微信要求做内容安全检查。",
  "你可以随时退出登录。注销账号会永久删除云端对话、日记、洞察和资料，且无法恢复。",
  "未满 14 周岁请在监护人同意下使用。若你正处在危机中，请立刻联系身边的人、当地急救 120 或心理援助热线 12356。",
];

const PRIVACY = [
  "处理者：有点情绪小程序运营者。处理目的：登录识别、保存你的情绪记录、生成陪伴回复和阶段回顾。",
  "收集的信息：微信 openid（必要时 unionid）；你可选填的昵称、头像；你发送的文字；日记与洞察。相册/相机仅在你点选照片或更换头像时使用。",
  "存储：账号数据保存在云端数据库。本机缓存用于离线查看，清掉小程序缓存不会删除已同步的云端记录。聊天配图默认不上传。",
  "第三方：陪伴与洞察会把你写下的文字发送给深度推理服务（DeepSeek）以生成回复，不把密钥放进小程序。",
  "你可在「我的」查看隐私保护指引、退出登录或注销账号。注销后删除云端个人数据。",
  "本服务不是医疗或心理咨询。如需专业帮助，请联系正规机构。",
];

export default function LegalPage() {
  const theme = usePageTheme();
  const kind = String(useRouter().params.kind || "terms");
  const isPrivacy = kind === "privacy";
  const title = isPrivacy ? "隐私政策" : "用户协议";
  const paragraphs = isPrivacy ? PRIVACY : TERMS;

  useDidShow(() => {
    Taro.setNavigationBarTitle({ title });
  });

  function openWeChatPrivacy() {
    if (process.env.TARO_ENV === "weapp" && typeof Taro.openPrivacyContract === "function") {
      Taro.openPrivacyContract({
        fail: () => Taro.showToast({ title: "暂时打不开微信隐私指引", icon: "none" }),
      });
    }
  }

  return (
    <View className={`legal ${theme.className}`}>
      <Text className="legal__title">{title}</Text>
      {paragraphs.map((p) => (
        <Text key={p} className="legal__p">
          {p}
        </Text>
      ))}
      {isPrivacy ? (
        <Button className="legal__btn" onClick={openWeChatPrivacy}>
          打开微信隐私保护指引
        </Button>
      ) : null}
    </View>
  );
}
