import { View, Text, Button } from "@tarojs/components";
import { formatClock } from "../../utils/diary-dates";
import { asMe, episodeHeadline, weatherMark } from "../../utils/diary-moods";
import { liveMessages, retryAnalysis, trashSession } from "../../utils/diary-store";
import type { Session } from "../../utils/diary-types";
import { useState } from "react";

export function SessionDigest({
  session,
  onChange,
}: {
  session: Session;
  onChange: () => void;
}) {
  const [rawOpen, setRawOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const thread = liveMessages()
    .filter((m) => m.sessionId === session.id && !m.pending && m.text.trim())
    .sort((a, b) => a.createdAt - b.createdAt);
  const userNotes = thread.filter((m) => m.role === "user").map((m) => m.text).filter(Boolean);
  const preview = userNotes.at(-1) || userNotes[0] || "（空）";
  const openChat = !session.endedAt;
  const title = episodeHeadline(session, userNotes);
  const a = session.analysis;
  const emotions = a?.emotions?.length ? a.emotions : session.primaryEmotions || [];
  const weather = a?.weatherFrom || session.weather;
  const stress = a?.stressFrom ?? session.stress;
  const energy = a?.energyFrom ?? session.energy;

  async function onRetry() {
    await retryAnalysis(session.id);
    onChange();
  }

  async function onTrash() {
    await trashSession(session.id);
    onChange();
  }

  return (
    <View className="sheet">
      <Text className="sheet__title">{title}</Text>
      <Text className="sheet__meta">
        {weather ? `${weatherMark(weather)} ${weather}` : ""}
        {weather && (stress != null || energy != null) ? "  " : ""}
        {stress != null ? `压力 ${stress}/10` : ""}
        {stress != null && energy != null ? "  " : ""}
        {energy != null ? `能量 ${energy}/10` : ""}
      </Text>
      <Text className="sheet__meta">
        {formatClock(session.startedAt)}
        {session.endedAt ? ` - ${formatClock(session.endedAt)}` : " · 还在聊"}
      </Text>
      {emotions.length ? <Text className="sheet__emotions">{emotions.join(" · ")}</Text> : null}
      <Text className="sheet__preview">「{preview}」</Text>

      {openChat ? (
        <Text className="sheet__hint">这段还在聊。点「就聊到这」后，会生成深度洞察。</Text>
      ) : null}

      {thread.length ? (
        <View className="sheet__block">
          <Button className="sheet__toggle" onClick={() => setRawOpen((v) => !v)}>
            {rawOpen ? "收起原始记录" : "原始记录"}
            <Text className={`sheet__caret ${rawOpen ? "sheet__caret--open" : ""}`}>⌄</Text>
          </Button>
          {rawOpen
            ? thread.slice(0, 40).map((m) => (
                <Text key={m.id} className="sheet__line">
                  {m.role === "user" ? "我" : "陪"} · {m.text}
                </Text>
              ))
            : null}
        </View>
      ) : null}

      {session.analysisStatus === "idle" && !openChat ? (
        <Button className="sheet__action" onClick={() => void onRetry()}>
          生成深度洞察
        </Button>
      ) : null}

      {session.analysisStatus === "pending" ? (
        <Text className="sheet__hint">正在生成深度洞察…</Text>
      ) : null}

      {session.analysisStatus === "error" ? (
        <View className="sheet__block">
          <Text className="sheet__hint">{session.analysisError}</Text>
          <Button className="sheet__action" onClick={() => void onRetry()}>
            再试一次
          </Button>
        </View>
      ) : null}

      {session.analysisStatus === "done" && a ? (
        <View className="sheet__block sheet__block--line">
          <Button className="sheet__toggle sheet__toggle--accent" onClick={() => setInsightOpen((v) => !v)}>
            {insightOpen ? "收起深度洞察" : "深度洞察"}
            <Text className={`sheet__caret ${insightOpen ? "sheet__caret--open" : ""}`}>⌄</Text>
          </Button>
          {insightOpen ? (
            <View>
              <InsightFlow analysis={a} emotions={emotions} session={session} />
              <Button className="sheet__faint" onClick={() => void onRetry()}>
                重新生成
              </Button>
            </View>
          ) : null}
        </View>
      ) : null}

      <View className="sheet__foot">
        <Button className="sheet__faint" onClick={() => void onTrash()}>
          放到回收站
        </Button>
      </View>
    </View>
  );
}

function InsightFlow({
  analysis,
  emotions,
  session,
}: {
  analysis: NonNullable<Session["analysis"]>;
  emotions: string[];
  session: Session;
}) {
  const feltFallback = [analysis.body, analysis.thoughts, (session.thoughts || []).join(" ")]
    .filter(Boolean)
    .join(" ");
  const steps = [
    { title: "原始情绪", body: analysis.originalEmotion || emotions.join(" · ") },
    { title: "发生了什么？", body: analysis.facts },
    { title: "我感受到了什么？", body: analysis.felt || feltFallback },
    { title: "我为什么会被触动？", body: analysis.coreTouch || session.coreTheme || "" },
    { title: "我真正需要什么？", body: analysis.needs || (session.coreNeeds || []).join(" · ") },
    { title: "这是否是我的一个重复模式？", body: analysis.pattern || "" },
    { title: "我还能如何理解这件事？", body: analysis.reframe || analysis.insight },
    { title: "我想如何对待自己？", body: analysis.treatSelf || analysis.seen || "" },
  ];

  return (
    <View className="flow">
      {steps.map((step, index) => (
        <View key={step.title}>
          {index > 0 ? (
            <Text className="flow__arrow" aria-hidden>
              ↓
            </Text>
          ) : null}
          <Text className="flow__title">{step.title}</Text>
          <Text className="flow__body">{asMe(step.body) || "这段里我还没说清。"}</Text>
        </View>
      ))}
    </View>
  );
}
