"use client";

import { useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { formatClock } from "@/lib/dates";
import { weatherMark } from "@/lib/guide";
import { useStore } from "@/context/store";
import { episodeHeadline } from "@/lib/title";
import type { Session } from "@/lib/types";

export function SessionDigest({ session }: { session: Session }) {
  const { liveMessages, retryAnalysis, trash } = useStore();
  const [rawOpen, setRawOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const thread = liveMessages
    .filter((m) => m.sessionId === session.id && !m.pending && (m.text.trim() || m.image))
    .sort((a, b) => a.createdAt - b.createdAt);
  const userNotes = thread.filter((m) => m.role === "user").map((m) => m.text).filter(Boolean);
  const preview = userNotes.at(-1) || userNotes[0] || "（图片）";
  const openChat = !session.endedAt;
  const title = episodeHeadline(session, userNotes);
  const a = session.analysis;
  const emotions = a?.emotions?.length ? a.emotions : session.primaryEmotions || [];
  const weather = a?.weatherFrom || session.weather;
  const stress = a?.stressFrom ?? session.stress;
  const energy = a?.energyFrom ?? session.energy;

  return (
    <article className="sheet px-4 py-4">
      <div className="min-w-0">
        <p className="font-display text-[16px] font-medium leading-6 text-ink">{title}</p>
        <p className="mt-1 text-[12px] leading-5 text-ink-faint">
          {weather ? `${weatherMark(weather)} ${weather}` : ""}
          {weather && (stress != null || energy != null) ? "  " : ""}
          {stress != null ? `压力 ${stress}/10` : ""}
          {stress != null && energy != null ? "  " : ""}
          {energy != null ? `能量 ${energy}/10` : ""}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-faint">
          {formatClock(session.startedAt)}
          {session.endedAt ? ` - ${formatClock(session.endedAt)}` : " · 还在聊"}
        </p>
        {emotions.length ? (
          <p className="mt-1 text-[13px] text-ink-soft">{emotions.join(" · ")}</p>
        ) : null}
        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink-soft">「{preview}」</p>
      </div>

      {openChat ? (
        <p className="mt-3 text-[13px] text-ink-faint">这段还在聊。点「就聊到这」后，会生成深度洞察。</p>
      ) : null}

      {thread.length ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setRawOpen((v) => !v)}
            className="flex items-center gap-1 text-[13px] text-ink-soft"
          >
            {rawOpen ? "收起原始记录" : "原始记录"}
            {rawOpen ? <CaretUp size={14} /> : <CaretDown size={14} />}
          </button>
          {rawOpen ? (
            <div className="mt-2 space-y-2 border-t border-black/5 pt-2">
              {thread.slice(0, 40).map((m) => (
                <p key={m.id} className="text-[13px] leading-5 text-ink-soft">
                  <span className="text-ink-faint">{m.role === "user" ? "我" : "陪"} · </span>
                  {m.text || "（图片）"}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {session.analysisStatus === "idle" && !openChat ? (
        <button
          type="button"
          className="mt-3 text-[13px] text-accent"
          onClick={() => retryAnalysis(session.id)}
        >
          生成深度洞察
        </button>
      ) : null}

      {session.analysisStatus === "pending" ? (
        <p className="mt-3 text-[13px] text-ink-soft">正在生成深度洞察…</p>
      ) : null}

      {session.analysisStatus === "error" ? (
        <div className="mt-3">
          <p className="text-[13px] text-ink-soft">{session.analysisError}</p>
          <button type="button" className="mt-1 text-[13px] text-accent" onClick={() => retryAnalysis(session.id)}>
            再试一次
          </button>
        </div>
      ) : null}

      {session.analysisStatus === "done" && a ? (
        <div className="mt-3 border-t border-black/5 pt-2">
          <button
            type="button"
            onClick={() => setInsightOpen((v) => !v)}
            className="flex items-center gap-1 text-[13px] text-accent"
          >
            {insightOpen ? "收起深度洞察" : "深度洞察"}
            {insightOpen ? <CaretUp size={14} /> : <CaretDown size={14} />}
          </button>
          {insightOpen ? (
            <>
              <InsightFlow analysis={a} emotions={emotions} session={session} />
              <button
                type="button"
                className="mt-3 text-[12px] text-ink-faint"
                onClick={() => retryAnalysis(session.id)}
              >
                重新生成
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex justify-end border-t border-black/5 pt-2">
        <button type="button" onClick={() => trash(session.id)} className="text-[11px] text-ink-faint">
          放到回收站
        </button>
      </div>
    </article>
  );
}

function asMe(text: string) {
  return text
    .replace(/这位用户/g, "我")
    .replace(/该用户/g, "我")
    .replace(/用户/g, "我")
    .trim();
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
    <div className="mt-3">
      {steps.map((step, index) => (
        <div key={step.title}>
          {index > 0 ? (
            <p className="py-1.5 text-center text-[12px] leading-none text-ink-faint" aria-hidden>
              ↓
            </p>
          ) : null}
          <section>
            <h3 className="mb-1 text-[13px] font-medium text-ink">{step.title}</h3>
            <p className="text-[14px] leading-6 text-ink-soft">
              {asMe(step.body) || "这段里我还没说清。"}
            </p>
          </section>
        </div>
      ))}
    </div>
  );
}
