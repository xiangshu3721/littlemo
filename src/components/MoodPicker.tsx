"use client";

import { MOODS } from "@/lib/moods";
import type { MoodId } from "@/lib/types";
import { MoodGlyph } from "./MoodGlyph";

export function MoodPicker({
  value,
  onChange,
  compact = false,
}: {
  value?: MoodId;
  onChange: (id: MoodId) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap ${compact ? "gap-2" : "gap-3"}`}>
      {MOODS.map((mood) => {
        const selected = value === mood.id;
        return (
          <button
            key={mood.id}
            type="button"
            onClick={() => onChange(mood.id)}
            className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 transition active:scale-[0.98] ${
              selected ? "bg-ink/8" : "hover:bg-ink/4"
            }`}
          >
            <MoodGlyph id={mood.id} size={compact ? 18 : 24} />
            <span className={`text-[11px] ${selected ? "text-ink font-medium" : "text-ink-soft"}`}>
              {mood.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
