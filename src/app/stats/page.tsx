"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { IconCaret } from "@/components/InkIcons";
import { MoodGlyph } from "@/components/MoodGlyph";
import { SessionDigest } from "@/components/SessionDigest";
import { useStore } from "@/context/store";
import { daysInMonth, startOfWeek, toDay } from "@/lib/dates";
import type { MoodId } from "@/lib/types";

export default function StatsPage() {
  const { liveSessions, liveMessages } = useStore();
  const [cursor, setCursor] = useState(() => new Date());
  const [pickedDay, setPickedDay] = useState<string>(() => toDay(new Date()));
  const [monthOpen, setMonthOpen] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const marksByDay = useMemo(() => {
    const map = new Map<string, { mood?: MoodId; has: boolean }>();
    const bump = (day: string, mood?: MoodId) => {
      const cur = map.get(day) || { has: false };
      map.set(day, { has: true, mood: mood || cur.mood });
    };
    for (const session of liveSessions) {
      bump(session.day, session.mood);
      for (const m of liveMessages) {
        if (m.sessionId === session.id) bump(m.day, session.mood);
      }
    }
    return map;
  }, [liveSessions, liveMessages]);

  const daySessions = pickedDay
    ? liveSessions
        .filter((s) =>
          liveMessages.some((m) => m.sessionId === s.id && m.day === pickedDay && m.role === "user" && m.text.trim()),
        )
        .sort((a, b) => {
          const last = (id: string) =>
            liveMessages
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
    <AppShell title="情绪日记">
      <div className="feed-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <div className="mb-2 flex items-center justify-between pt-1">
          <button
            type="button"
            aria-label="上个月"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="grid h-9 w-9 place-items-center text-ink-soft"
          >
            <IconCaret className="h-[18px] w-[18px] rotate-90" />
          </button>
          <p className="font-display text-[17px] font-medium tracking-[0.06em] text-ink">
            {year}年{month + 1}月
          </p>
          <button
            type="button"
            aria-label="下个月"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="grid h-9 w-9 place-items-center text-ink-soft"
          >
            <IconCaret className="h-[18px] w-[18px] -rotate-90" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMonthOpen((v) => !v)}
          className="mb-4 flex w-full items-center justify-center gap-1 text-[12px] tracking-[0.14em] text-ink-soft"
        >
          {monthOpen ? "收起月历" : "展开月历"}
          <IconCaret className={`h-3.5 w-3.5 ${monthOpen ? "rotate-180" : ""}`} />
        </button>

        <div className="grid grid-cols-7 gap-y-2 text-center text-[11px] tracking-[0.16em] text-ink-faint">
          {"一二三四五六日".split("").map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-y-2">
          {calendarDays.map((date, i) => {
            if (!date) return <span key={`e-${i}`} />;
            const day = toDay(date);
            const inMonth = date.getMonth() === month;
            const mark = marksByDay.get(day);
            const selected = pickedDay === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setPickedDay(day);
                  if (date.getMonth() !== month) setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
                }}
                className={`flex h-12 flex-col items-center justify-center rounded-full ${
                  selected ? "bg-seal text-paper" : ""
                } ${inMonth ? "" : "opacity-35"}`}
              >
                <span className={`text-[13px] ${selected ? "text-paper" : "text-ink"}`}>{date.getDate()}</span>
                {mark?.mood ? (
                  <MoodGlyph id={mark.mood} size={12} />
                ) : mark?.has ? (
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full ${selected ? "bg-paper/80" : "bg-accent/70"}`} />
                ) : (
                  <span className="h-[22px]" />
                )}
              </button>
            );
          })}
        </div>

        {pickedDay ? (
          <section className="mt-6 space-y-3">
            <p className="chapter-mark">这一日</p>
            <h2 className="font-display text-[17px] font-medium tracking-wide text-ink">{pickedDay}</h2>
            {daySessions.length === 0 ? (
              <p className="pt-2 text-[13px] leading-7 text-ink-soft">这一天还没有记下的情绪。</p>
            ) : (
              daySessions.map((session) => <SessionDigest key={session.id} session={session} />)
            )}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
