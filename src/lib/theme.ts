export const THEME_STORAGE_KEY = "suisuinian.theme";

/** Local-clock window for 「跟随时间」. Device timezone; 06:00–18:59 light, 19:00–05:59 dark. */
export const AUTO_LIGHT_HOUR = 6;
export const AUTO_DARK_HOUR = 19;

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_OPTIONS: {
  id: ThemePreference;
  label: string;
  name: string;
  hint: string;
}[] = [
  { id: "light", label: "日间", name: "干净手账", hint: "白纸浅灰，安静手账。" },
  { id: "dark", label: "夜间", name: "墨夜金线", hint: "墨底金线，静夜倾听。" },
  { id: "system", label: "跟随时间", name: "按本机时钟", hint: "06:00–18:59 日间，19:00–05:59 夜间。" },
];

export const LIGHT_THEME_COLOR = "#fafafa";
export const DARK_THEME_COLOR = "#0a0a0a";

export function themeFromLocalClock(date = new Date()): ResolvedTheme {
  const hour = date.getHours();
  return hour >= AUTO_LIGHT_HOUR && hour < AUTO_DARK_HOUR ? "light" : "dark";
}

export function parseThemePreference(raw: string | null): ThemePreference {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  if (!raw) return "system";
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === "light" || parsed === "dark" || parsed === "system") return parsed;
    if (parsed && typeof parsed === "object" && "preference" in parsed) {
      const preference = (parsed as { preference?: unknown }).preference;
      if (preference === "light" || preference === "dark" || preference === "system") {
        return preference;
      }
    }
  } catch {
    /* keep default */
  }
  return "system";
}

export function resolveTheme(preference: ThemePreference, date = new Date()): ResolvedTheme {
  return preference === "system" ? themeFromLocalClock(date) : preference;
}

export function msUntilThemeBoundary(date = new Date()) {
  const next = new Date(date);
  const hour = date.getHours();
  if (hour >= AUTO_LIGHT_HOUR && hour < AUTO_DARK_HOUR) {
    next.setHours(AUTO_DARK_HOUR, 0, 0, 0);
  } else if (hour >= AUTO_DARK_HOUR) {
    next.setDate(next.getDate() + 1);
    next.setHours(AUTO_LIGHT_HOUR, 0, 0, 0);
  } else {
    next.setHours(AUTO_LIGHT_HOUR, 0, 0, 0);
  }
  return Math.max(1000, next.getTime() - date.getTime());
}

export function readStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function writeStoredPreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* private mode or blocked storage */
  }
}

export function themeColor(resolved: ResolvedTheme) {
  return resolved === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
}

export function applyDocumentTheme(resolved: ResolvedTheme, preference?: ThemePreference) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  if (preference) root.dataset.themePref = preference;
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themeColor(resolved));
}

/** Runs before paint so the first frame already matches the stored preference. */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var raw=localStorage.getItem(k);var pref="system";if(raw==="light"||raw==="dark"||raw==="system")pref=raw;else if(raw){try{var p=JSON.parse(raw);if(p==="light"||p==="dark"||p==="system")pref=p;else if(p&&(p.preference==="light"||p.preference==="dark"||p.preference==="system"))pref=p.preference;}catch(e){}}var h=new Date().getHours();var theme=pref==="system"?(h>=${AUTO_LIGHT_HOUR}&&h<${AUTO_DARK_HOUR}?"light":"dark"):pref;var r=document.documentElement;r.setAttribute("data-theme",theme);r.setAttribute("data-theme-pref",pref);r.style.colorScheme=theme;}catch(e){}})();`;
