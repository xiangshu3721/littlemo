import { View, Text, Textarea, Button, ScrollView } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useMemo, useState } from "react";
import { api, ApiError } from "../../utils/api";
import { isArchiveMark } from "../../utils/diary-moods";
import {
  appendTurn,
  ensureOpenSession,
  hydrateFromCloud,
  liveMessages,
  liveSessions,
  newDiaryId,
  openTalkSession,
  requestInsight,
  resumePendingAnalysis,
} from "../../utils/diary-store";
import type { Message } from "../../utils/diary-types";
import { isLoggedIn } from "../../utils/session";
import "./index.scss";

function clock(ts: number) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function HomePage() {
  const [thread, setThread] = useState<Message[]>([]);
  const [endedById, setEndedById] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [canInsight, setCanInsight] = useState(false);

  const bubbles = useMemo(() => {
    const list = [...thread];
    if (pending) {
      list.push({
        id: "pending",
        sessionId: "",
        role: "assistant",
        text: "在听…",
        createdAt: Date.now(),
        day: "",
        pending: true,
      });
    }
    return list;
  }, [thread, pending]);

  function syncLocal() {
    const sessions = liveSessions();
    const map: Record<string, boolean> = {};
    for (const session of sessions) map[session.id] = Boolean(session.endedAt);
    setEndedById(map);
    setThread(liveMessages());
    setCanInsight(Boolean(openTalkSession()));
  }

  async function load() {
    if (!isLoggedIn()) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    try {
      await hydrateFromCloud();
      void resumePendingAnalysis();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Taro.redirectTo({ url: "/pages/login/index" });
        return;
      }
      Taro.showToast({
        title: err instanceof ApiError ? err.message : "记录读不出来",
        icon: "none",
      });
    }
    syncLocal();
  }

  useDidShow(() => {
    void load();
  });

  async function send() {
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);
    setPending(true);
    setDraft("");
    try {
      const open = await ensureOpenSession(content);
      const userMessageId = newDiaryId();
      const res = await api<{
        note: { createdAt: string };
        reply: { content: string; createdAt: string; id: string };
        messages?: { id: string; createdAt: string }[];
      }>("/api/chat", {
        method: "POST",
        data: { content, sessionId: open.id, clientId: userMessageId },
      });
      await appendTurn({
        text: content,
        reply: res.reply.content,
        createdAt: new Date(res.note.createdAt).getTime() || Date.now(),
        replyAt: new Date(res.reply.createdAt).getTime() || Date.now(),
        sessionId: open.id,
        userMessageId,
        assistantMessageId: res.reply.id,
      });
      syncLocal();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "没接上本机服务，请确认电脑已开 littlemo（端口 3000）";
      Taro.showToast({
        title: msg.slice(0, 40),
        icon: "none",
        duration: 2500,
      });
    } finally {
      setBusy(false);
      setPending(false);
    }
  }

  async function closeAndInsight() {
    if (!canInsight || closing || busy) return;
    setClosing(true);
    try {
      await requestInsight();
      syncLocal();
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : "没收进去",
        icon: "none",
      });
    } finally {
      setClosing(false);
    }
  }

  const lastId = bubbles.at(-1)?.id;

  return (
    <View className="home">
      <ScrollView className="home__feed" scrollY scrollIntoView={lastId}>
        {bubbles.length === 0 ? (
          <View className="home__empty">
            <View className="home__seal" />
            <Text className="home__empty-title">去记下这一刻</Text>
            <Text className="home__empty-body">繁华之外的心灵净土，让灵魂慢一点，让烦恼少一些</Text>
          </View>
        ) : (
          bubbles.map((bubble, index) => {
            const next = bubbles[index + 1];
            const archived =
              isArchiveMark(bubble.text) ||
              (Boolean(endedById[bubble.sessionId]) && (!next || next.sessionId !== bubble.sessionId));
            const hideArchiveBubble = isArchiveMark(bubble.text) && bubble.role === "assistant";
            return (
              <View id={bubble.id} key={bubble.id}>
                {hideArchiveBubble ? null : (
                  <View className={`bubble ${bubble.role === "user" ? "bubble--user" : "bubble--ai"}`}>
                    <View className={`bubble__sheet ${bubble.pending ? "bubble__sheet--pending" : ""}`}>
                      <Text className="bubble__text">{bubble.text}</Text>
                    </View>
                    <Text className="bubble__time">{bubble.pending ? "" : clock(bubble.createdAt)}</Text>
                  </View>
                )}
                {archived ? (
                  <Text className="home__archive">这段已收进情绪日记，深度洞察可在日记里展开</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
      <View className="home__composer">
        {canInsight ? (
          <Button
            className="home__close"
            disabled={closing || busy}
            onClick={() => void closeAndInsight()}
          >
            {closing ? "正在收这段…" : "就聊到这，帮我深度洞察下这段情绪"}
          </Button>
        ) : null}
        <View className="home__row">
          <Textarea
            className="home__input"
            value={draft}
            maxlength={4000}
            autoHeight
            placeholder="想说就说…"
            onInput={(e) => setDraft(e.detail.value)}
          />
          <Button className="home__send" disabled={busy || !draft.trim()} onClick={send}>
            送出
          </Button>
        </View>
      </View>
    </View>
  );
}
