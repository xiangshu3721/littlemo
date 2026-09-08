"use client";

import { moodById } from "@/lib/moods";
import type { MoodId } from "@/lib/types";

const MARK: Record<MoodId, string> = {
  happy: "M8 13.2c1.1 1.3 2.5 2 4 2s2.9-.7 4-2",
  calm: "M8.2 13.5h7.6",
  sad: "M8 15.2c1.1-1.1 2.5-1.7 4-1.7s2.9.6 4 1.7",
  angry: "M8.4 14.8 11 13.2M15.6 14.8 13 13.2",
  anxious: "M9.2 13.6h1.6M13.2 13.6h1.6",
  tired: "M8.5 14.2c1.6-.8 3.1-.8 4.7 0",
};

export function MoodGlyph({
  id,
  size = 22,
}: {
  id: MoodId;
  size?: number;
}) {
  const mood = moodById(id);
  if (!mood) return null;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full"
      style={{
        width: size + 8,
        height: size + 8,
        background: mood.tint,
        color: mood.ink,
      }}
      title={mood.label}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="9.2" cy="10.2" r="0.85" fill="currentColor" />
        <circle cx="14.8" cy="10.2" r="0.85" fill="currentColor" />
        <path
          d={MARK[id]}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
