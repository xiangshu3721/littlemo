import { View, Text, Button, ScrollView, Image } from "@tarojs/components";
import Taro, { useDidShow, useRouter } from "@tarojs/taro";
import { useMemo, useState } from "react";
import { api } from "../../utils/api";
import { asMe } from "../../utils/diary-moods";
import {
  hasPatternSummary,
  liveSessions,
  loadDiary,
  requestPatternSummary,
} from "../../utils/diary-store";
import type { PatternSummary, Session } from "../../utils/diary-types";
import { isLoggedIn } from "../../utils/session";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

type ContactConfig = {
  wechatId: string;
  qrUrl: string;
  configured: boolean;
  placeholderHint: string;
};

export default function SummaryPage() {
  const theme = usePageTheme();
  const router = useRouter();
  const sessionId = String(router.params?.sessionId || "");
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<PatternSummary | null>(null);
  const [contact, setContact] = useState<ContactConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const status = session?.patternSummaryStatus || "idle";

  async function loadContact() {
    try {
      const res = await api<{ contact: ContactConfig }>("/api/contact", { auth: false });
      setContact(res.contact);
    } catch {
      setContact({
        wechatId: "",
        qrUrl: "",
        configured: false,
        placeholderHint: "联系方式待配置",
      });
    }
  }

  async function load() {
    if (!isLoggedIn()) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    if (!sessionId) {
      setError("找不到这一段。");
      return;
    }
    const found = loadDiary().sessions.find((s) => s.id === sessionId) || null;
    setSession(found);
    if (found?.patternSummary && found.patternSummaryStatus === "done") {
      setSummary(found.patternSummary);
      setError("");
    } else if (found?.patternSummaryStatus === "error") {
      setError(found.patternSummaryError || "小结没写出来");
    } else if (found && !hasPatternSummary(found)) {
      setBusy(true);
      setError("");
      const next = await requestPatternSummary(sessionId);
      const latest = liveSessions().find((s) => s.id === sessionId) || null;
      setSession(latest);
      setSummary(next);
      if (!next) setError(latest?.patternSummaryError || "小结没写出来");
      setBusy(false);
    }
    await loadContact();
  }

  useDidShow(() => {
    void load();
  });

  async function onRetry() {
    if (!sessionId || busy) return;
    setBusy(true);
    setError("");
    const next = await requestPatternSummary(sessionId, { force: true });
    const latest = liveSessions().find((s) => s.id === sessionId) || null;
    setSession(latest);
    setSummary(next);
    if (!next) setError(latest?.patternSummaryError || "小结没写出来");
    setBusy(false);
  }

  function onCopyWechat() {
    const id = contact?.wechatId?.trim();
    if (!id) {
      Taro.showToast({ title: contact?.placeholderHint || "联系方式待配置", icon: "none" });
      return;
    }
    Taro.setClipboardData({
      data: id,
      success: () => Taro.showToast({ title: "微信号已复制", icon: "none" }),
    });
  }

  const threads = useMemo(() => summary?.threads || [], [summary]);

  return (
    <View className={`summary ${theme.className}`}>
      <ScrollView className="summary__feed" scrollY>
        <Text className="summary__mark">一页手账</Text>
        <Text className="summary__title">{asMe(summary?.headline || "情绪模式小结")}</Text>
        <Text className="summary__sub">
          {session?.day ? `${session.day} · ` : ""}
          我们一起看清这一段，不是诊断，也不是结论。
        </Text>

        {busy || status === "pending" ? (
          <Text className="summary__faint">正在写下这一页…</Text>
        ) : null}

        {error && !summary ? (
          <View className="summary__err">
            <Text>{error}</Text>
            <Button className="summary__btn" onClick={() => void onRetry()}>
              再试一次
            </Button>
          </View>
        ) : null}

        {summary ? (
          <View className="summary__sheet">
            <Text className="summary__narrative">{asMe(summary.narrative)}</Text>
            {threads.length ? (
              <View className="summary__threads">
                <Text className="summary__label">轻轻看见的几条线</Text>
                {threads.map((line, i) => (
                  <Text key={`${i}-${line}`} className="summary__thread">
                    · {asMe(line)}
                  </Text>
                ))}
              </View>
            ) : null}
            {summary.takeaway ? (
              <View className="summary__take">
                <Text className="summary__label">带走一句</Text>
                <Text className="summary__takeaway">{asMe(summary.takeaway)}</Text>
              </View>
            ) : null}
            <Button className="summary__ghost" onClick={() => void onRetry()} disabled={busy}>
              重新整理这一页
            </Button>
          </View>
        ) : null}

        <View className="summary__cta">
          <Text className="summary__cta-title">想跟真人把这件事说透</Text>
          <Text className="summary__cta-body">
            如果这一页触动了你，也可以找一个真人慢慢说。不着急，出口在这里就好。
          </Text>
          {contact?.qrUrl ? (
            <Image className="summary__qr" src={contact.qrUrl} mode="aspectFit" />
          ) : null}
          {contact?.configured && contact.wechatId ? (
            <Button className="summary__btn summary__btn--seal" onClick={onCopyWechat}>
              复制微信号 · {contact.wechatId}
            </Button>
          ) : (
            <Button className="summary__btn summary__btn--disabled" disabled onClick={onCopyWechat}>
              {contact?.placeholderHint || "联系方式待配置"}
            </Button>
          )}
          <Text className="summary__cta-note">稍后可在服务端配置 CONTACT_WECHAT_* 环境变量。</Text>
        </View>
      </ScrollView>
    </View>
  );
}
