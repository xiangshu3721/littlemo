import type { MoodId, Session } from "./diary-types";

export const MOODS: {
  id: MoodId;
  label: string;
  tint: string;
  ink: string;
}[] = [
  { id: "happy", label: "开心", tint: "#F3E2B8", ink: "#8A5A12" },
  { id: "calm", label: "平静", tint: "#D7E4D2", ink: "#3E5A3A" },
  { id: "sad", label: "难过", tint: "#D5DEE8", ink: "#3A4A62" },
  { id: "angry", label: "生气", tint: "#EBD0C8", ink: "#7A3328" },
  { id: "anxious", label: "焦虑", tint: "#E5D7C4", ink: "#6B4E2A" },
  { id: "tired", label: "疲惫", tint: "#DED6E4", ink: "#4E3A5C" },
];

export function moodById(id?: MoodId) {
  return MOODS.find((m) => m.id === id);
}

export const WEATHER_MARK: Record<string, string> = {
  晴: "☀️",
  多云: "🌤",
  阴: "☁️",
  雨: "🌧",
  雾: "🌫",
  风: "🌬",
  雷暴: "⛈",
  风暴: "🌪",
};

export function weatherMark(name?: string) {
  if (!name) return "";
  return WEATHER_MARK[name] || name;
}

export function isArchiveMark(text: string) {
  const t = text.replace(/\s/g, "");
  return /这段先收到这儿|深度洞察会放进|已收进情绪日记|已收进日历/.test(t);
}

export function wantsCloseEpisode(text: string) {
  const t = text.replace(/\s/g, "");
  if (!t) return false;
  if (t.length <= 16 && /结束(吧|了|好了)?$/.test(t)) return true;
  if (/就聊到这/.test(t)) return true;
  if (/^(先这样|先到这[儿里]?[了吧]?|到此为止|不聊了|今天就这样|就到这[儿里]?)/.test(t)) return true;
  if (/收进日历|记下(这段|来)|没有记录|日历里/.test(t)) return true;
  return false;
}

export function episodeHeadline(session: Session, userNotes: string[]) {
  const compact = (value?: string) => value?.replace(/\s+/g, " ").trim() || "";
  const fromUser = compact(userNotes[0]);
  const fromAnalysis = compact(session.analysis?.title);
  const fromTouch = compact(session.analysis?.coreTouch);
  const raw = fromUser || fromAnalysis || fromTouch || compact(session.title) || "一段情绪";
  return raw.slice(0, 18);
}

export function asMe(text: string) {
  return text
    .replace(/这位用户/g, "我")
    .replace(/该用户/g, "我")
    .replace(/用户/g, "我")
    .trim();
}

export function clipText(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .slice(0, max);
}

export const DIARY_LIMITS = {
  latestChars: 4000,
  lineChars: 800,
  analyzeLines: 80,
  periodEntries: 60,
  digestChars: 4000,
};
