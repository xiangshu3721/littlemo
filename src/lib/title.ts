import type { Session } from "./types";

export function episodeHeadline(session: Session, userNotes: string[]) {
  const compact = (value?: string) => value?.replace(/\s+/g, " ").trim() || "";
  const fromUser = compact(userNotes[0]);
  const fromAnalysis = compact(session.analysis?.title);
  const fromTouch = compact(session.analysis?.coreTouch);
  const raw = fromUser || fromAnalysis || fromTouch || compact(session.title) || "一段情绪";
  return raw.slice(0, 18);
}
