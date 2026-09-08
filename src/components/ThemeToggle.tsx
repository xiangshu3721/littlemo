"use client";

import { IconMoon, IconSun, IconTime } from "@/components/InkIcons";
import { useTheme } from "@/context/theme";
import { THEME_OPTIONS, type ThemePreference } from "@/lib/theme";

function IconFor({ preference, className }: { preference: ThemePreference; className?: string }) {
  if (preference === "dark") return <IconMoon className={className} />;
  if (preference === "system") return <IconTime className={className} />;
  return <IconSun className={className} />;
}

/** Header: two explicit buttons — day and night. No clock. */
export function ThemeCycleButton({ compact = false }: { compact?: boolean }) {
  const { preference, resolved, setPreference } = useTheme();
  const active = preference === "system" ? resolved : preference;
  const size = compact ? "h-10 w-10" : "h-9 w-9";

  return (
    <div
      role="group"
      aria-label="外观"
      className="flex items-center gap-0.5 rounded-full border border-line/80 bg-paper/80 p-0.5"
    >
      <button
        type="button"
        onClick={() => setPreference("light")}
        className={`grid place-items-center rounded-full active:scale-[0.98] ${size} ${
          active === "light" ? "bg-wash text-ink" : "text-ink-faint hover:text-ink-soft"
        }`}
        aria-label="白天 · 干净手账"
        aria-pressed={active === "light"}
        title="白天 · 干净手账"
      >
        <IconSun className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        onClick={() => setPreference("dark")}
        className={`grid place-items-center rounded-full active:scale-[0.98] ${size} ${
          active === "dark" ? "bg-wash text-ink" : "text-ink-faint hover:text-ink-soft"
        }`}
        aria-label="黑夜 · 墨夜金线"
        aria-pressed={active === "dark"}
        title="黑夜 · 墨夜金线"
      >
        <IconMoon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

export function ThemePicker() {
  const { preference, setPreference } = useTheme();

  return (
    <div role="radiogroup" aria-label="选择外观" className="space-y-2">
      {THEME_OPTIONS.map((option) => {
        const on = preference === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${option.label}，${option.name}`}
            onClick={() => setPreference(option.id)}
            className={`flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left tracking-wide ${
              on ? "bg-wash text-ink" : "text-ink-soft hover:bg-wash/70"
            }`}
          >
            <span className="mt-0.5 text-ink" aria-hidden>
              <IconFor preference={option.id} className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[15px] font-medium text-ink">{option.label}</span>
                <span className="text-[11px] tracking-wide text-ink-faint" aria-hidden>
                  {option.name}
                </span>
              </span>
              <span className="mt-0.5 block text-[12px] leading-5 text-ink-faint">{option.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
