import { View, Text, Button, ScrollView } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";
import { daysInMonth, startOfWeek, toDay } from "../../utils/diary-dates";
import { moodById } from "../../utils/diary-moods";
import { hydrateFromCloud, liveMessages, liveSessions, resumePendingAnalysis } from "../../utils/diary-store";
import type { MoodId, Session } from "../../utils/diary-types";
import { api, ApiError } from "../../utils/api";
import { isLoggedIn } from "../../utils/session";
import { SessionDigest } from "./digest";
import { PeriodInsight } from "./insight";
import "./index.scss";

type Tab = "calendar" | "period";

export default function DiaryPage() {
  const [tab, setTab] = useState<Tab>("calendar");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState(liveMessages());
  const [cursor, setCursor] = useState(() => new Date());
  const [pickedDay, setPickedDay] = useState<string>(() => toDay(new Date()));
  const [monthOpen, setMonthOpen] = useState(false);
  const [tick, setTick] = useState(0);

  function refresh() {
    setSessions(liveSessions());
    setMessages(liveMessages());
    setTick((n) => n + 1);
  }

  async function load() {
    if (!isLoggedIn()) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    try {
      const [noteRes, chatRes] = await Promise.all([
        api<{ notes: { id: string; content: string; createdAt: string }[] }>("/api/notes"),
        api<{ messages: { id: string; role: string; content: string; createdAt: string }[] }>("/api/chat"),
      ]);
      await hydrateFromCloud(noteRes.notes || [], chatRes.messages || []);
      void resumePendingAnalysis();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Taro.redirectTo({ url: "/pages/login/index" });
        return;
      }
    }
    refresh();
  }

  const pendingAnalysis = sessions.some((s) => s.analysisStatus === "pending");

  useDidShow(() => {
    void load();
  });

  useEffect(() => {
    if (!pendingAnalysis) return undefined;
    const timer = setInterval(() => refresh(), 1200);
    return () => clearInterval(timer);
  }, [pendingAnalysis]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const marksByDay = useMemo(() => {
    const map = new Map<string, { mood?: MoodId; has: boolean }>();
    const bump = (day: string, mood?: MoodId) => {
      const cur = map.get(day) || { has: false };
      map.set(day, { has: true, mood: mood || cur.mood });
    };
    for (const session of sessions) {
      bump(session.day, session.mood);
      for (const m of messages) {
        if (m.sessionId === session.id) bump(m.day, session.mood);
      }
    }
    return map;
  }, [sessions, messages, tick]);

  const daySessions = pickedDay
    ? sessions
        .filter((s) =>
          messages.some((m) => m.sessionId === s.id && m.day === pickedDay && m.role === "user" && m.text.trim()),
        )
        .sort((a, b) => {
          const last = (id: string) =>
            messages
              .filter((m) => m.sessionId === id && m.day === pickedDay)
              .reduce((t, m) => Math.max(t, m.createdAt), 0);
          return last(b.id) - last(a.id);
        })
    : [];

  const calendarDays = useMemo(() => {
    if (monthOpen) {
      const pad = (new Date(year, month, 1).getDay() + 6) % 7;
      const total = daysInMonth(year, month);
      return [
        ...Array.from({ length: pad }, () => null as Date | null),
        ...Array.from({ length: total }, (_, i) => new Date(year, month, i + 1)),
      ];
    }
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const anchor = pickedDay.startsWith(prefix)
      ? new Date(`${pickedDay}T12:00:00`)
      : new Date(year, month, 1);
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [monthOpen, year, month, pickedDay]);

  return (
    <View className="diary">
      <View className="tabs">
        <Button className={`tabs__btn ${tab === "calendar" ? "tabs__btn--on" : ""}`} onClick={() => setTab("calendar")}>
          日历
        </Button>
        <Button className={`tabs__btn ${tab === "period" ? "tabs__btn--on" : ""}`} onClick={() => setTab("period")}>
          这一段日子
        </Button>
      </View>
      <ScrollView className="diary__feed" scrollY>
        {tab === "calendar" ? (
          <View>
            <View className="cal__nav">
              <Button
                className="cal__arrow"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
              >
                ‹
              </Button>
              <Text className="cal__title">
                {year}年{month + 1}月
              </Text>
              <Button
                className="cal__arrow"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
              >
                ›
              </Button>
            </View>
            <Button className="cal__fold" onClick={() => setMonthOpen((v) => !v)}>
              {monthOpen ? "收起月历" : "展开月历"}
              <Text className={`sheet__caret ${monthOpen ? "sheet__caret--open" : ""}`}>⌄</Text>
            </Button>
            <View className="cal__week">
              {"一二三四五六日".split("").map((d) => (
                <Text key={d} className="cal__wd">
                  {d}
                </Text>
              ))}
            </View>
            <View className="cal__grid">
              {calendarDays.map((date, i) => {
                if (!date) return <View key={`e-${i}`} className="cal__cell" />;
                const day = toDay(date);
                const inMonth = date.getMonth() === month;
                const mark = marksByDay.get(day);
                const selected = pickedDay === day;
                const mood = mark?.mood ? moodById(mark.mood) : undefined;
                return (
                  <View
                    key={day}
                    className={`cal__cell ${selected ? "cal__cell--on" : ""} ${inMonth ? "" : "cal__cell--out"}`}
                    onClick={() => {
                      setPickedDay(day);
                      if (date.getMonth() !== month) setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
                    }}
                  >
                    <Text className={`cal__num ${selected ? "cal__num--on" : ""}`}>{date.getDate()}</Text>
                    {mood ? (
                      <View className="cal__mood" style={{ background: mood.tint }} />
                    ) : mark?.has ? (
                      <View className={`cal__dot ${selected ? "cal__dot--on" : ""}`} />
                    ) : (
                      <View className="cal__spacer" />
                    )}
                  </View>
                );
              })}
            </View>
            {pickedDay ? (
              <View className="day">
                <Text className="chapter-mark">这一日</Text>
                <Text className="day__title">{pickedDay}</Text>
                {daySessions.length === 0 ? (
                  <Text className="day__empty">这一天还没有记下的情绪。</Text>
                ) : (
                  daySessions.map((session) => (
                    <SessionDigest key={`${session.id}-${tick}`} session={session} onChange={refresh} />
                  ))
                )}
              </View>
            ) : null}
          </View>
        ) : (
          <PeriodInsight sessions={sessions} messages={messages} />
        )}
      </ScrollView>
    </View>
  );
}
