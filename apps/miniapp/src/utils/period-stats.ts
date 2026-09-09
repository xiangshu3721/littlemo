import { eachDay, formatClock, inRange, weekdayName } from "./diary-dates";
import { moodById } from "./diary-moods";
import type { Message, PeriodKind, PeriodPayloadEntry, Session } from "./diary-types";

const POSITIVE = /开心|平静|轻松|安心|满足|期待|感动|温暖|希望|释然|喜悦|放松|自由|感激|踏实/;
const NEGATIVE = /焦虑|委屈|疲惫|难过|生气|孤独|无助|无力|无奈|恐惧|羞耻|自责|压抑|愤怒|苦恼|迷茫|害怕|烦|累|慌/;

export type EmotionCount = { name: string; count: number };

export type TrendPoint = { day: string; score: number | null; label: string };

export type PeriodStats = {
  count: number;
  top: EmotionCount[];
  avgIntensity: number | null;
  positiveShare: number | null;
  negativeShare: number | null;
  mixedShare: number | null;
  compare: { name: string; delta: number }[];
  trend: TrendPoint[];
  nightShare: number | null;
  peakWeekday: string | null;
  hourBuckets: { name: string; count: number }[];
  weekdayBuckets: { name: string; count: number }[];
  digest: string;
};

function polarity(name: string): "pos" | "neg" | "mix" {
  if (POSITIVE.test(name)) return "pos";
  if (NEGATIVE.test(name)) return "neg";
  return "mix";
}

function intensity(session: Session) {
  if (session.analysis?.stressFrom != null) return session.analysis.stressFrom;
  if (session.stress != null) return session.stress;
  const mood = session.mood || session.analysis?.suggestedMood;
  if (mood === "anxious") return 8;
  if (mood === "angry") return 7;
  if (mood === "sad") return 6;
  if (mood === "tired") return 5;
  if (mood === "calm") return 3;
  if (mood === "happy") return 2;
  return null;
}

function stateScore(session: Session) {
  const energy = session.analysis?.energyFrom ?? session.energy;
  if (energy != null) return energy;
  const stress = intensity(session);
  return stress == null ? null : Math.max(1, Math.min(10, 10 - stress));
}

function emotionsOf(session: Session) {
  return session.analysis?.emotions?.length ? session.analysis.emotions : session.primaryEmotions || [];
}

export function sessionsInRange(
  sessions: Session[],
  messages: Message[],
  startDay: string,
  endDay: string,
) {
  return sessions.filter(
    (s) =>
      Boolean(s.endedAt) &&
      !s.deletedAt &&
      (inRange(s.day, startDay, endDay) ||
        messages.some((m) => m.sessionId === s.id && inRange(m.day, startDay, endDay))),
  );
}

function counts(sessions: Session[]) {
  const map = new Map<string, number>();
  for (const session of sessions) {
    for (const name of emotionsOf(session)) {
      map.set(name, (map.get(name) || 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function hourLabel(hour: number) {
  if (hour < 6) return "凌晨";
  if (hour < 12) return "上午";
  if (hour < 18) return "下午";
  if (hour < 21) return "晚上";
  return "深夜";
}

export function buildPeriodStats(
  current: Session[],
  previous: Session[],
  startDay: string,
  endDay: string,
): PeriodStats {
  const top = counts(current).slice(0, 5);
  const prevMap = new Map(counts(previous).map((row) => [row.name, row.count]));
  const intensities = current.map(intensity).filter((n): n is number => n != null);
  const avgIntensity =
    intensities.length ? Math.round((intensities.reduce((a, b) => a + b, 0) / intensities.length) * 10) / 10 : null;
  let pos = 0;
  let neg = 0;
  let mix = 0;
  for (const session of current) {
    for (const name of emotionsOf(session)) {
      const p = polarity(name);
      if (p === "pos") pos += 1;
      else if (p === "neg") neg += 1;
      else mix += 1;
    }
  }
  const polar = pos + neg + mix;
  const byHour = new Map<string, number>();
  const byWeek = new Map<string, number>();
  let night = 0;
  for (const session of current) {
    const hour = new Date(session.startedAt).getHours();
    const bucket = hourLabel(hour);
    byHour.set(bucket, (byHour.get(bucket) || 0) + 1);
    const wd = weekdayName(session.day);
    byWeek.set(wd, (byWeek.get(wd) || 0) + 1);
    if (hour >= 20 || hour < 6) night += 1;
  }
  const peakWeekday = [...byWeek.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const byDay = new Map<string, number[]>();
  for (const session of current) {
    const score = stateScore(session);
    if (score == null) continue;
    const list = byDay.get(session.day) || [];
    list.push(score);
    byDay.set(session.day, list);
  }
  const days = eachDay(startDay, endDay);
  const trend: TrendPoint[] = days.map((day, index) => {
    const scores = byDay.get(day);
    const avg = scores?.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const show =
      days.length <= 8 ||
      index === 0 ||
      index === days.length - 1 ||
      Number(day.slice(8)) === 1 ||
      index % 7 === 0;
    return {
      day,
      score: avg == null ? null : Math.round(avg * 10) / 10,
      label: show ? `${Number(day.slice(8))}日` : "",
    };
  });
  const compare = previous.length
    ? top.map((row) => {
        const before = prevMap.get(row.name) || 0;
        if (before === 0 && row.count === 0) return { name: row.name, delta: 0 };
        if (before === 0) return { name: row.name, delta: 100 };
        return { name: row.name, delta: Math.round(((row.count - before) / before) * 100) };
      })
    : [];
  const hourBuckets = ["凌晨", "上午", "下午", "晚上", "深夜"].map((name) => ({
    name,
    count: byHour.get(name) || 0,
  }));
  const weekdayBuckets = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((name) => ({
    name,
    count: byWeek.get(name) || 0,
  }));
  const digest = [
    `段数 ${current.length}`,
    `高频 ${top.map((r) => `${r.name}${r.count}`).join("、") || "无"}`,
    avgIntensity != null ? `平均强度 ${avgIntensity}/10` : "",
    polar ? `正向 ${Math.round((pos / polar) * 100)}% 负向 ${Math.round((neg / polar) * 100)}%` : "",
    current.length ? `20点后 ${Math.round((night / current.length) * 100)}%` : "",
    peakWeekday ? `最多的星期 ${peakWeekday}` : "",
    compare.length
      ? `相较上一段 ${compare.map((c) => `${c.name}${c.delta >= 0 ? "↑" : "↓"}${Math.abs(c.delta)}%`).join(" ")}`
      : "",
  ]
    .filter(Boolean)
    .join("；");

  return {
    count: current.length,
    top,
    avgIntensity,
    positiveShare: polar ? Math.round((pos / polar) * 100) : null,
    negativeShare: polar ? Math.round((neg / polar) * 100) : null,
    mixedShare: polar ? Math.round((mix / polar) * 100) : null,
    compare,
    trend,
    nightShare: current.length ? Math.round((night / current.length) * 100) : null,
    peakWeekday,
    hourBuckets,
    weekdayBuckets,
    digest,
  };
}

export function toPayload(sessions: Session[], messages: Message[]): PeriodPayloadEntry[] {
  return sessions.slice(-40).map((s) => {
    const quotes = messages
      .filter((m) => m.sessionId === s.id && m.role === "user" && m.text.trim())
      .slice(-2)
      .map((m) => m.text.trim());
    return {
      day: s.day,
      time: formatClock(s.startedAt),
      weekday: weekdayName(s.day),
      hour: new Date(s.startedAt).getHours(),
      text: [s.title, s.analysis?.facts, s.analysis?.coreTouch, quotes.join(" / ")]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 220),
      mood: s.mood ? moodById(s.mood)?.label : undefined,
      emotions: emotionsOf(s),
      stress: intensity(s),
      energy: s.analysis?.energyFrom ?? s.energy,
      weather: s.analysis?.weatherFrom || s.weather,
      coreTouch: s.analysis?.coreTouch,
      needs: s.analysis?.needs,
      pattern: s.analysis?.pattern,
    };
  });
}

export function kindLabel(kind: PeriodKind) {
  if (kind === "week") return "本周";
  if (kind === "month") return "本月";
  return "近90天";
}
