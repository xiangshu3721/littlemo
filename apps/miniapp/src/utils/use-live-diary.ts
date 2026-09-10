import { useEffect, useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { ApiError } from "./api";
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
    // 缓存先出来，再从云端拉账号日记
    refresh();
    if (!isLoggedIn()) return;
    try {
      await hydrateFromCloud();
      void resumePendingAnalysis();
      refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
    }
  }

  useDidShow(() => {
    void load();
  });

  const pendingAnalysis = sessions.some(
    (s) => s.analysisStatus === "pending" || s.patternSummaryStatus === "pending",
  );

  useEffect(() => {
    if (!pendingAnalysis) return undefined;
    const timer = setInterval(() => refresh(), 1200);
    return () => clearInterval(timer);
  }, [pendingAnalysis]);

  return { sessions, messages, tick, refresh };
}
