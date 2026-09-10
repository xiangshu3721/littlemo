import { useEffect, useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { api, ApiError } from "./api";
import { hydrateFromCloud, liveMessages, liveSessions, resumePendingAnalysis } from "./diary-store";
import type { Session } from "./diary-types";
import { isLoggedIn } from "./session";

export function useLiveDiary() {
  const [sessions, setSessions] = useState<Session[]>(() => liveSessions());
  const [messages, setMessages] = useState(() => liveMessages());
  const [tick, setTick] = useState(0);

  function refresh() {
    setSessions(liveSessions());
    setMessages(liveMessages());
    setTick((n) => n + 1);
  }

  async function load() {
    refresh();
    if (!isLoggedIn()) return;
    try {
      const [noteRes, chatRes] = await Promise.all([
        api<{ notes: { id: string; content: string; createdAt: string }[] }>("/api/notes", {
          timeout: 8_000,
        }),
        api<{ messages: { id: string; role: string; content: string; createdAt: string }[] }>(
          "/api/chat",
          { timeout: 8_000 },
        ),
      ]);
      await hydrateFromCloud(noteRes.notes || [], chatRes.messages || []);
      void resumePendingAnalysis();
      refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
    }
  }

  useDidShow(() => {
    void load();
  });

  const pendingAnalysis = sessions.some((s) => s.analysisStatus === "pending");

  useEffect(() => {
    if (!pendingAnalysis) return undefined;
    const timer = setInterval(() => refresh(), 1200);
    return () => clearInterval(timer);
  }, [pendingAnalysis]);

  return { sessions, messages, tick, refresh };
}
