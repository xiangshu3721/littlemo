import { Button, Text, View } from "@tarojs/components";
import Taro, { useDidShow, useRouter } from "@tarojs/taro";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

const TERMS = [
  "「有点情绪」提供情绪记录、陪伴对话和阶段回顾。这是生活记录与文字陪伴，不是心理咨询、心理治疗或医疗建议，也不能替代专业帮助。",
  "本服务适用 14 周岁及以上用户。未满 14 周岁请在监护人同意下使用。",
  "进入后，我们使用微信身份（openid）建立账号，把对话、日记段落和阶段洞察存在云端，方便你换设备后继续看。头像和昵称只有在你主动填写时才会保存。聊天里选的照片默认留在本机，发给陪伴服务的只有「附了一张图」。",
  "陪伴回复由服务端调用的语言模型生成。模型会读你写下的文字以生成回复，密钥只放在服务器。使用陪伴对话或深度洞察即表示你理解并同意为此处理相关内容。",
  "请勿发布违法、侵权、淫秽或骚扰他人的内容。我们会按微信要求做内容安全检查。",
  "若你不同意本协议或隐私政策，请不要登录，可直接退出小程序。已有账号可在登录后于「我的」退出登录或注销账号；注销将永久删除云端对话、日记、洞察和资料。",
  "若你正处在危机中，请立刻联系身边的人、当地急救 120 或心理援助热线 12356。",
];

const PRIVACY = [
  "处理者：有点情绪小程序运营者。处理目的：登录识别、保存你的情绪记录、生成陪伴回复和阶段回顾。登录与数据处理的完整说明见本政策及敏感信息处理说明。",
  "收集的信息：微信 openid（必要时 unionid）；你可选填的昵称、头像；你发送的文字；日记与洞察。相册/相机仅在你点选照片或更换头像时使用。",
  "你写入的情绪、心理状态等内容属于敏感个人信息，仅用于为你生成陪伴回复和阶段回顾。进入前需单独勾选同意；详情见敏感信息处理说明。",
  "存储：账号数据保存在云端数据库。本机缓存用于离线查看，清掉小程序缓存不会删除已同步的云端记录。聊天配图默认不上传。",
  "第三方：陪伴与洞察会把你写下的文字发送给深度推理服务（DeepSeek）以生成回复，不把密钥放进小程序。",
  "你可在「我的」查看微信隐私保护指引、退出登录或注销账号。注销后删除云端个人数据。不同意政策时可退出小程序，不登录则不会新建或更新账号数据。",
  "本服务不是医疗或心理咨询。如需专业帮助，请联系正规机构。适用年龄为 14 周岁及以上。",
];

const SENSITIVE = [
  "情绪记录、心理状态描述、日记原文和由此生成的洞察，属于敏感个人信息。",
  "处理目的：生成陪伴回复、保存情绪日记、生成周/月/阶段回顾。不会用于诊断、治疗或向你推销医疗产品。",
  "处理方式：登录后写入云端数据库；生成回复时把你写下的文字发送给深度推理服务（DeepSeek）。聊天配图默认留在本机。",
  "你可拒绝：不勾选则无法登录，可直接退出小程序。已登录用户可在「我的」注销账号，云端相关数据将被删除。",
  "撤回同意：退出登录后停止新的处理；注销账号即撤回并删除已存储的敏感个人信息。",
];

export default function LegalPage() {
  const theme = usePageTheme();
  const kind = String(useRouter().params.kind || "terms");
  const isPrivacy = kind === "privacy";
  const isSensitive = kind === "sensitive";
  const title = isSensitive ? "敏感信息处理说明" : isPrivacy ? "隐私政策" : "服务协议";
  const paragraphs = isSensitive ? SENSITIVE : isPrivacy ? PRIVACY : TERMS;

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
