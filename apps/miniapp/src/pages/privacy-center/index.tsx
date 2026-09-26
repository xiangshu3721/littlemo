import { Button, ScrollView, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";
import { api, ApiError } from "../../utils/api";
import { clearDiaryCache, loadDiary } from "../../utils/diary-store";
import {
  LEGAL_INFO_DEFAULTS,
  isPendingLegalValue,
  loadPublicLegalInfo,
  type PublicLegalInfo,
} from "../../utils/legal";
import { clearAppData, getToken, getUser, saveUser } from "../../utils/session";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

export default function PrivacyCenterPage() {
  const theme = usePageTheme();
  const [legal, setLegal] = useState<PublicLegalInfo>(LEGAL_INFO_DEFAULTS);
  const [busy, setBusy] = useState(false);

  useDidShow(() => {
    if (!getToken()) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    void loadPublicLegalInfo().then(setLegal);
  });

  function openLegal(type: "terms" | "privacy" | "ai") {
    Taro.navigateTo({ url: `/pages/legal/index?type=${type}` });
  }

  function openWechatPrivacy() {
    if (process.env.TARO_ENV === "weapp" && typeof Taro.openPrivacyContract === "function") {
      Taro.openPrivacyContract({
        fail: () => Taro.showToast({ title: "请在微信设置中查看隐私保护指引。", icon: "none" }),
      });
      return;
    }
    openLegal("privacy");
  }

  function copyContact(value: string, label: string) {
    if (isPendingLegalValue(value)) {
      Taro.showModal({
        title: "联系渠道未设置",
        content: "运营方尚未填写可用的联系渠道。补齐前无法正式上线。",
        showCancel: false,
      });
      return;
    }
    Taro.setClipboardData({
      data: value,
      success: () => Taro.showToast({ title: `${label}已复制`, icon: "none" }),
    });
  }

  async function exportData() {
    if (busy) return;
    const answer = await new Promise<boolean>((resolve) => {
      Taro.showModal({
        title: "导出账号数据",
        content: "将生成包含微信 OpenID、昵称、头像、聊天和日记的 JSON 文件。聊天照片原图不包含在副本中。文件先保存在本机；之后是否转发由你选择，请妥善保管。",
        confirmText: "生成副本",
        cancelText: "取消",
        success: (result) => resolve(Boolean(result.confirm)),
        fail: () => resolve(false),
      });
    });
    if (!answer) return;
    setBusy(true);
    Taro.showLoading({ title: "正在整理" });
    try {
      const accountData = await api<Record<string, unknown>>("/api/me/export");
      const userId = getUser()?.id;
      const bundle = userId ? loadDiary(userId) : { sessions: [], messages: [], reports: [] };
      const payload = {
        ...accountData,
        deviceDiary: bundle,
        note: "本机日记可能包含尚未同步到云端的改动；本机图片文件不会嵌入 JSON 副本。",
      };
      const root = Taro.env.USER_DATA_PATH;
      if (!root) throw new Error("当前设备不支持保存数据副本。");
      const fs = Taro.getFileSystemManager();
      const filePath = `${root}/littlemo-export-${Date.now()}.json`;
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
      Taro.hideLoading();
      Taro.shareFileMessage({
        filePath,
        fileName: "有点情绪-个人数据副本.json",
        fail: () => Taro.showToast({ title: "副本已生成在本机，但分享没有打开。", icon: "none" }),
      });
    } catch (err) {
      Taro.hideLoading();
      Taro.showToast({
        title:
          err instanceof ApiError || err instanceof Error
            ? err.message.slice(0, 40)
            : "导出失败，请稍后重试。",
        icon: "none",
      });
    } finally {
      setBusy(false);
    }
  }

  async function withdrawAiConsent() {
    if (busy) return;
    if (!getUser()?.aiDataConsentVersion) {
      Taro.showToast({ title: "当前没有已保存的 AI 处理同意。", icon: "none" });
      return;
    }
    const answer = await new Promise<boolean>((resolve) => {
      Taro.showModal({
        title: "撤回 AI 处理同意",
        content: "撤回后，新的对话和分析不会发送给 AI，直到你重新阅读并同意。已保存的聊天和日记不会因此删除。",
        confirmText: "确认撤回",
        cancelText: "先不撤回",
        success: (result) => resolve(Boolean(result.confirm)),
        fail: () => resolve(false),
      });
    });
    if (!answer) return;
    setBusy(true);
    try {
      const data = await api<{ user: NonNullable<ReturnType<typeof getUser>> }>("/api/me/consents", {
        method: "DELETE",
      });
      saveUser(data.user);
      Taro.showToast({ title: "已撤回 AI 处理同意。", icon: "none" });
    } catch (err) {
      Taro.showToast({
        title: err instanceof ApiError ? err.message : "撤回没有完成，请稍后重试。",
        icon: "none",
      });
    } finally {
      setBusy(false);
    }
  }

  async function withdrawSensitiveInfoConsent() {
    if (busy) return;
    if (!getUser()?.sensitiveInfoConsentVersion) {
      Taro.showToast({ title: "当前没有已保存的敏感信息处理同意。", icon: "none" });
      return;
    }
    const answer = await new Promise<boolean>((resolve) => {
      Taro.showModal({
        title: "撤回敏感信息处理同意",
        content: "撤回后，聊天、情绪日记和分析等需要处理这些记录的功能会停用，直到你重新阅读并同意。已保存记录不会自动删除；你仍可导出或注销账号删除业务记录。",
        confirmText: "确认撤回",
        cancelText: "先不撤回",
        success: (result) => resolve(Boolean(result.confirm)),
        fail: () => resolve(false),
      });
    });
    if (!answer) return;
    setBusy(true);
    try {
      const data = await api<{ user: NonNullable<ReturnType<typeof getUser>> }>("/api/me/consents?type=sensitive", {
        method: "DELETE",
      });
      saveUser(data.user);
      Taro.showToast({ title: "已撤回；相关功能已停用。", icon: "none" });
      setTimeout(() => Taro.reLaunch({ url: "/pages/login/index" }), 500);
    } catch (err) {
      Taro.showToast({
        title: err instanceof ApiError ? err.message : "撤回没有完成，请稍后重试。",
        icon: "none",
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (busy) return;
    const answer = await new Promise<boolean>((resolve) => {
      Taro.showModal({
        title: "永久注销并删除记录",
        content: "将删除云端账号、昵称头像、聊天、日记、洞察和本机小程序数据。此操作无法恢复。请先导出需要保留的数据。",
        confirmText: "永久删除",
        cancelText: "取消",
        confirmColor: "#8a4a42",
        success: (result) => resolve(Boolean(result.confirm)),
        fail: () => resolve(false),
      });
    });
    if (!answer) return;
    setBusy(true);
    try {
      await api<{ deleted: boolean }>("/api/me", { method: "DELETE" });
      clearDiaryCache();
      clearAppData();
      Taro.showToast({ title: "账号及业务记录已删除。", icon: "none" });
      setTimeout(() => Taro.reLaunch({ url: "/pages/login/index" }), 500);
    } catch (err) {
      Taro.showToast({
        title: err instanceof ApiError ? err.message : "注销没有完成，请稍后重试。",
        icon: "none",
      });
    } finally {
      setBusy(false);
    }
  }

  function call12356() {
    Taro.makePhoneCall({
      phoneNumber: "12356",
      fail: () => Taro.showToast({ title: "无法拨号时，请手动拨打 12356。", icon: "none" }),
    });
  }

  return (
    <View className={`privacy-center ${theme.className}`}>
      <ScrollView className="privacy-center__scroll" scrollY>
        <Text className="privacy-center__intro">查看说明，也可以直接管理账号资料和记录。</Text>
        <View className="privacy-center__group">
          <Text className="privacy-center__label">运营信息</Text>
          <Text className="privacy-center__detail">运营主体：{legal.operatorName}</Text>
          <Text className="privacy-center__detail">小程序备案：{legal.miniProgramFiling}</Text>
          <Text className="privacy-center__detail">适用年龄：{legal.ageScope}</Text>
        </View>

        <View className="privacy-center__group">
          <Text className="privacy-center__label">说明文件</Text>
          <Button className="privacy-center__row" onClick={() => openLegal("terms")}>服务协议</Button>
          <Button className="privacy-center__row" onClick={() => openLegal("privacy")}>隐私政策</Button>
          <Button className="privacy-center__row" onClick={() => Taro.navigateTo({ url: "/pages/legal/index?type=sensitive" })}>敏感个人信息处理说明</Button>
          <Button className="privacy-center__row" onClick={() => openLegal("ai")}>AI 服务与数据处理</Button>
          <Button className="privacy-center__row" onClick={openWechatPrivacy}>微信隐私保护指引</Button>
        </View>

        <View className="privacy-center__group">
          <Text className="privacy-center__label">个人信息管理</Text>
          <Button className="privacy-center__row" disabled={busy} onClick={() => void exportData()}>
            {busy ? "正在处理…" : "导出个人信息副本"}
          </Button>
          <Button className="privacy-center__row" disabled={busy} onClick={() => void withdrawAiConsent()}>
            撤回 AI 数据处理同意
          </Button>
          <Button className="privacy-center__row" disabled={busy} onClick={() => void withdrawSensitiveInfoConsent()}>
            撤回敏感个人信息处理同意
          </Button>
          <Text className="privacy-center__note">更改昵称和头像可在“我的”页面操作。退出登录只清理登录状态，不会删除云端记录。</Text>
        </View>

        <View className="privacy-center__group">
          <Text className="privacy-center__label">帮助与投诉</Text>
          <Text className="privacy-center__detail">隐私联系：{legal.privacyContact}</Text>
          <Button className="privacy-center__row" onClick={() => copyContact(legal.privacyContact, "隐私联系渠道")}>
            复制隐私联系渠道
          </Button>
          <Text className="privacy-center__detail">投诉举报：{legal.complaintContact}</Text>
          <Text className="privacy-center__detail">反馈时限：{legal.complaintResponseTime}</Text>
          <Button className="privacy-center__row" onClick={() => copyContact(legal.complaintContact, "投诉渠道")}>
            复制投诉举报渠道
          </Button>
        </View>

        <View className="privacy-center__safety">
          <Text className="privacy-center__safety-title">需要现实中的支持</Text>
          <Text className="privacy-center__note">本服务不是急救、心理咨询或心理治疗。如果你现在不安全，请联系可信任的人；紧急情况拨打 120 或 110。需要心理援助时，可自行拨打国家卫生健康委公布的 12356 热线，接通情况以当地实际服务为准。</Text>
          <Button className="privacy-center__call" onClick={call12356}>拨打 12356</Button>
        </View>

        <Button className="privacy-center__delete" disabled={busy} onClick={() => void deleteAccount()}>
          永久注销账号并删除业务记录
        </Button>
        <Text className="privacy-center__foot">注销后，业务数据库中的账号和关联记录会删除。依法留存的网络日志及服务备份不一定能即时清除，周期以运营方核实并公布的规则为准。</Text>
      </ScrollView>
    </View>
  );
}
