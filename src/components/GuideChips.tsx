"use client";

import { ACTIONS, BODY_FEELS, BODY_PARTS, WEATHERS } from "@/lib/guide";
import { useStore } from "@/context/store";
import type { Message } from "@/lib/types";

export function GuideChips({ message, isLatest }: { message: Message; isLatest: boolean }) {
  const { answerChip } = useStore();
  const interaction = message.interaction;
  if (!interaction || interaction.answered || !isLatest || message.role !== "assistant") return null;

  const base =
    interaction.kind === "weather"
      ? WEATHERS.map((w) => w.id)
      : interaction.kind === "stress" || interaction.kind === "energy"
        ? interaction.options.length
          ? interaction.options
          : ["0", "2", "4", "6", "8", "10"]
        : interaction.kind === "body"
          ? [...BODY_PARTS, ...BODY_FEELS, ...interaction.options]
          : interaction.kind === "action"
            ? [...ACTIONS, ...interaction.options]
            : interaction.options;
  const options = uniq([...base, interaction.kind === "weather" ? "自定义" : "其他"]);

  const hint =
    interaction.kind === "weather"
      ? "现在更像哪种天气"
      : interaction.kind === "emotions"
        ? "有哪些靠近现在的感觉"
        : interaction.kind === "stress"
          ? "压力大概在哪"
          : interaction.kind === "energy"
            ? "如果是一块心理电池，还剩多少"
            : interaction.kind === "body"
              ? "身体哪里有感觉"
              : interaction.kind === "needs"
                ? "这一刻最希望被怎么对待"
                : interaction.kind === "action"
                  ? "如果要为自己做一件事"
                  : "";

  return (
    <div className="max-w-[88%] pl-1">
      {hint ? <p className="mb-2 text-[12px] tracking-wide text-ink-faint">{hint}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => void answerChip(message.id, label)}
            className="rounded-full bg-wash/90 px-3 py-1.5 text-[13px] tracking-wide text-ink shadow-[inset_0_0_0_1px_var(--line)] active:scale-[0.98]"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function uniq(list: string[]) {
  return [...new Set(list.filter(Boolean))];
}
