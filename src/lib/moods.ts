import type { MoodId } from "./types";

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
