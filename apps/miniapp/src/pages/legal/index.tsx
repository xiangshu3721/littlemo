import { Button, ScrollView, Text, View } from "@tarojs/components";
import Taro, { useDidShow, useRouter } from "@tarojs/taro";
import { useMemo, useState } from "react";
import { api, ApiError } from "../../utils/api";
import { getToken, getUser, saveUser } from "../../utils/session";
import {
  AI_DATA_CONSENT_VERSION,
  LEGAL_INFO_DEFAULTS,
  isPendingLegalValue,
  isProductionLegalGate,
  loadPublicLegalInfo,
  type PublicLegalInfo,
} from "../../utils/legal";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

type LegalSection = { title: string; body: string };

export default function LegalPage() {
  const theme = usePageTheme();
  const router = useRouter<{ type?: string; consent?: string }>();
  const pageType = router.params.type === "terms"
    ? "terms"
    : router.params.type === "ai"
      ? "ai"
      : router.params.type === "sensitive"
        ? "sensitive"
        : "privacy";
  const consentMode = pageType === "ai" && router.params.consent === "1";
  const [legal, setLegal] = useState<PublicLegalInfo>(LEGAL_INFO_DEFAULTS);
  const [busy, setBusy] = useState(false);

  useDidShow(() => {
    void loadPublicLegalInfo().then(setLegal);
  });

  const sections = useMemo<LegalSection[]>(() => {
    if (pageType === "terms") {
      return [
        {
          title: "服务提供方与适用年龄",
          body: `运营主体：${legal.operatorName}。本服务适用年龄：${legal.ageScope}。当前仅向已确认年满18周岁的用户提供服务。登录即使用微信身份；聊天、日记等数据处理方式见隐私政策和敏感个人信息处理说明。`,
        },
        {
          title: "服务内容与边界",
          body: "本服务提供 AI 生成的情绪陪伴对话、情绪日记和阶段洞察。回复不是由真人实时提供，也不是医疗诊断、心理治疗或紧急救援；内容可能不准确、不完整，请结合实际判断。",
        },
        {
          title: "账号与使用方式",
          body: "你使用微信身份登录。昵称和头像可自行设置；聊天、日记和洞察写入账号云端。请勿发布违法违规、侵权或未经授权的他人个人信息。你对主动输入的内容负责；我们发现违规内容时可以拒绝处理、停止相关功能或删除对应记录。",
        },
        {
          title: "AI 内容和数据处理",
          body: `首次使用 AI 前，我们会单独说明发送给模型服务方的数据与处理规则，并取得你的同意。模型服务方：${legal.aiProvider}；当前模型标识：${legal.aiModel}。未同意时，AI 对话与分析不会发送。`,
        },
        {
          title: "退出、删除和服务变更",
          body: "不同意本协议或更新后的条款时，可以停止使用并退出小程序。已有账号可在隐私中心导出副本或申请注销。AI 数据处理会在首次使用相关功能前另行说明并征求同意。注销会删除当前业务数据库中的账号及关联记录；备份、网络日志等仍按实际云服务配置和法律要求处理。",
        },
        {
          title: "风险求助与投诉",
          body: `本服务不能代替现实支持。若你或他人正面临紧急危险，请联系身边可信任的人，并拨打当地急救 120 或报警 110；心理援助可拨打 12356。投诉渠道：${legal.complaintContact}。反馈时限：${legal.complaintResponseTime}。`,
        },
        {
          title: "协议更新",
          body: `当前服务协议版本：${legal.termsVersion}。小程序备案编号：${legal.miniProgramFiling}。重要条款更新后会再次提示你阅读；不同意时可以停止使用并申请注销账号。`,
        },
      ];
    }

    if (pageType === "ai") {
      return [
        {
          title: "你正在与 AI 互动",
          body: `本服务不是人工客服或真人陪伴。聊天回复、深度洞察和阶段分析均由人工智能模型生成。模型提供方：${legal.aiProvider}；模型标识：${legal.aiModel}。模型服务备案信息：${legal.aiServiceFiling}。算法备案信息：${legal.aiAlgorithmFiling}。`,
        },
        {
          title: "哪些内容会发给模型服务方",
          body: "当你发送消息或请求分析时，当前对话文字和为保持上下文所需的近期对话、日记摘要会发送到 DeepSeek API。聊天照片本身留在设备上，接口只收到“附有图片”的标记；主动设置为头像的照片会上传到账号云端。",
        },
        {
          title: "处理用途与保存规则",
          body: `模型服务数据处理规则：${legal.aiProcessingSummary}。模型处理区域：${legal.aiProcessingRegion}。账号记录与云端数据的存储区域：${legal.storageRegion}。个人信息保存规则：${legal.retentionDescription}。公示信息不完整时，不会向 AI 服务发送内容。`,
        },
        {
          title: "你可以选择",
          body: "同意后才会向 AI 服务发送内容。你可以拒绝，不影响查看协议或管理账号；也可以在隐私中心撤回后续 AI 处理同意。撤回不会自动删除已经保存的聊天和日记，如需删除请另行导出或注销账号。",
        },
        {
          title: "使用边界",
          body: "模型可能出错，也可能无法理解复杂处境。请勿输入身份证号、账号密码、精确住址、医疗诊断等不必要的敏感信息。涉及人身安全时请联系现实中的可信任人员、急救 120、报警 110 或心理援助热线 12356。",
        },
      ];
    }

    if (pageType === "sensitive") {
      return [
        {
          title: "哪些信息属于敏感个人信息",
          body: "情绪日记和聊天中可能包含或反映你的心理状态、情绪状况、个人经历及关系信息；系统生成的情绪洞察和阶段报告也可能推断出此类信息。请勿主动填写与功能无关的身份证号、精确住址、医疗诊断等内容。",
        },
        {
          title: "处理目的与必要性",
          body: "运营方会将你主动记录的情绪日记、聊天内容、情绪标签及生成的洞察/报告与账号关联，用于保存记录、提供连续对话、生成你主动请求的分析并展示历史。这些记录是情绪日记、连续陪伴与洞察功能的必要数据；拒绝该项处理时，不能使用需要保存或分析这些内容的核心功能，你可以退出而不注册。",
        },
        {
          title: "处理方式、接收方与风险",
          body: `记录由运营方保存在云端，区域：${legal.storageRegion}；保存期限：${legal.retentionDescription}。只有在你另行同意 AI 数据处理后，相关文字及必要上下文才会发送给 ${legal.aiProvider} 生成回复或分析。敏感信息泄露或被滥用可能损害人格尊严、人身或财产安全。运营方采取访问控制等保护措施；公示的接收方、区域或期限不完整时，相关功能保持关闭。`,
        },
        {
          title: "你的选择与权利",
          body: "这项确认与服务协议同意、AI 数据处理同意分别作出。你可以拒绝并退出；使用过程中可停止记录、撤回后续 AI 处理同意，或导出并注销账号删除业务记录。注销与依法保留的日志、备份处理规则以隐私政策公布内容为准。",
        },
      ];
    }

    return [
      {
        title: "处理者与联系渠道",
        body: `个人信息处理者：${legal.operatorName}。隐私联系渠道：${legal.privacyContact}。适用年龄范围：${legal.ageScope}。`,
      },
      {
        title: "登录与记录说明",
        body: "登录会使用微信身份识别账号。聊天和日记会保存在云端。头像仅在你主动更换时上传。情绪等可能属于敏感个人信息，相关处理方式见敏感个人信息处理说明。使用 AI 前会另行说明并征求同意。",
      },
      {
        title: "收集的信息和用途",
        body: "登录时，微信及 CloudBase 身份认证会提供用于识别账号的 OpenID；服务端保存该标识和你对已年满18周岁的确认时间。你可以主动提供昵称、头像。你输入的聊天内容、情绪日记、洞察和阶段报告会与账号关联，用于提供连续对话、保存记录、生成分析和展示历史。情绪、心理状态等可能属于敏感个人信息；首次使用相关记录功能前会单独说明处理目的、必要性和影响并取得单独同意。",
      },
      {
        title: "AI 服务与单独同意",
        body: `发送聊天或请求分析时，相关文字、必要的近期对话和日记摘要会交由 ${legal.aiProvider} 的 ${legal.aiModel} 模型处理。模型处理区域：${legal.aiProcessingRegion}。其数据保存及模型优化规则：${legal.aiProcessingSummary}。首次使用 AI 前会单独征求同意；不同意时不会向该服务发送内容。`,
      },
      {
        title: "头像、照片和权限",
        body: "微信昵称和头像不是登录必需项。你主动更换头像时，压缩后的头像会保存到设备和账号云端。选择照片用于聊天时，原图只留在本机；发送给服务端和模型的只有文字及附图标记，不上传图片内容。相机、相册只在你主动选择相应操作时调用。",
      },
      {
        title: "存储、接收方和保存期限",
        body: `账号资料与记录保存在运营方配置的 CloudBase / PostgreSQL 云端，区域为：${legal.storageRegion}。AI 处理由 ${legal.aiProvider} 提供。数据保存期限：${legal.retentionDescription}。注销会删除业务数据库中的账号及关联内容；服务备份和依法留存的网络日志可能按对应服务商策略继续保留，周期以本页公布的保存规则为准。`,
      },
      {
        title: "你可以如何管理信息",
        body: "你可以更改昵称和头像、导出账号数据副本、撤回后续 AI 数据处理同意，或申请注销账号并删除关联业务记录。不同意更新后的隐私政策时，可退出小程序，或进入隐私中心管理、导出和注销已有账号。退出登录只清理登录状态，不等于删除云端记录；清理小程序缓存也不等于注销账号。",
      },
      {
        title: "本地保存与安全",
        body: "小程序会在本机保存登录令牌、资料、主题设置及日记缓存。运营方应采用访问控制等措施保护服务端数据。请不要与他人共用设备；导出的 JSON 数据副本含账号和记录信息，分享前请确认接收人。",
      },
      {
        title: "未成年人信息",
          body: `当前声明的服务年龄范围：${legal.ageScope}。本服务不面向未成年人，也不提供未成年人模式。登录时需自行确认已满18周岁；该确认不是实名年龄核验。如发现未成年人使用，将停止服务并删除相关账号资料。`,
      },
      {
        title: "政策版本与联系",
        body: `隐私政策版本：${legal.privacyVersion}。个人信息保护联系渠道：${legal.privacyContact}。投诉举报渠道：${legal.complaintContact}。处理反馈时限：${legal.complaintResponseTime}。`,
      },
    ];
  }, [legal, pageType]);

  async function agreeToAiProcessing() {
    if (busy) return;
    const missingProviderDisclosure = [
      legal.operatorName,
      legal.aiProcessingSummary,
      legal.aiProcessingRegion,
      legal.storageRegion,
      legal.retentionDescription,
      legal.aiServiceFiling,
      legal.aiAlgorithmFiling,
    ].some(isPendingLegalValue);
    if (isProductionLegalGate() && missingProviderDisclosure) {
      Taro.showModal({
        title: "暂不能启用 AI",
        content: "运营方尚未补齐模型服务、备案或数据保存规则。信息确认前不会向 AI 服务发送内容。",
        showCancel: false,
      });
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ user: ReturnType<typeof getUser> }>("/api/me/consents", {
        method: "POST",
        data: { aiDataConsentVersion: AI_DATA_CONSENT_VERSION },
      });
      if (data.user) saveUser(data.user);
      Taro.navigateBack();
    } catch (err) {
      Taro.showToast({
        title: err instanceof ApiError ? err.message : "授权没有保存，请稍后重试。",
        icon: "none",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className={`legal-page ${theme.className}`}>
      <ScrollView className="legal-page__scroll" scrollY>
        <Text className="legal-page__kicker">
          {pageType === "terms" ? "服务协议" : pageType === "ai" ? "AI 处理说明" : pageType === "sensitive" ? "敏感信息说明" : "隐私政策"}
        </Text>
        <Text className="legal-page__title">{pageType === "terms" ? "使用前请读完" : pageType === "ai" ? "先了解数据去向" : pageType === "sensitive" ? "这是一项单独选择" : "你的信息如何处理"}</Text>
        <Text className="legal-page__meta">运营主体：{legal.operatorName}</Text>
        {sections.map((section) => (
          <View className="legal-page__section" key={section.title}>
            <Text className="legal-page__heading">{section.title}</Text>
            <Text className="legal-page__body">{section.body}</Text>
          </View>
        ))}
        <Text className="legal-page__foot">
          {isPendingLegalValue(legal.operatorName) || isPendingLegalValue(legal.miniProgramFiling)
            ? "公示的运营主体、联系渠道、备案或数据保存信息尚未补齐。补齐前本页不能作为正式发布文本。"
            : `内容版本以本页显示为准。服务协议 ${legal.termsVersion}，隐私政策 ${legal.privacyVersion}。`}
        </Text>
        {getToken() && (pageType === "privacy" || pageType === "terms") ? (
          <Button className="legal-page__manage" onClick={() => Taro.navigateTo({ url: "/pages/privacy-center/index" })}>
            管理或删除已有账号数据
          </Button>
        ) : null}
      </ScrollView>
      {consentMode ? (
        <View className="legal-page__actions">
          <Button className="legal-page__agree" loading={busy} onClick={() => void agreeToAiProcessing()}>
            {busy ? "正在保存…" : "同意以上规则并启用 AI"}
          </Button>
          <Button className="legal-page__cancel" onClick={() => Taro.navigateBack()}>
            暂不同意，返回
          </Button>
        </View>
      ) : null}
    </View>
  );
}
