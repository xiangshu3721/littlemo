import Taro, { useDidShow } from "@tarojs/taro";
import { useCallback, useState } from "react";

export const THEME_STORAGE_KEY = "littlemo.theme";

/** Local-clock window for 「跟随时间」. Device timezone; 06:00–18:59 light, 19:00–05:59 dark. */
export const AUTO_LIGHT_HOUR = 6;
export const AUTO_DARK_HOUR = 19;

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const LIGHT_CHROME = {
  navBg: "#f7f7f7",
  navFront: "#000000",
  pageBg: "#e8e8e6",
  tabBg: "#f7f7f7",
  tabColor: "#999999",
  tabSelected: "#5f6f52",
  border: "white" as const,
  textStyle: "dark" as const,
};

const DARK_CHROME = {
  navBg: "#0a0a0a",
  navFront: "#ffffff",
  pageBg: "#050505",
  tabBg: "#0a0a0a",
  tabColor: "#c4a574",
  tabSelected: "#f5f1e6",
  border: "black" as const,
  textStyle: "light" as const,
};

export function themeFromLocalClock(date = new Date()): ResolvedTheme {
  const hour = date.getHours();
  return hour >= AUTO_LIGHT_HOUR && hour < AUTO_DARK_HOUR ? "light" : "dark";
}

export function parseThemePreference(raw: string | null | undefined): ThemePreference {
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

export function readStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(Taro.getStorageSync(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function writeStoredPreference(preference: ThemePreference) {
  try {
    Taro.setStorageSync(THEME_STORAGE_KEY, preference);
  } catch {
    /* private mode or blocked storage */
  }
}

export function themeClass(resolved: ResolvedTheme) {
  return resolved === "dark" ? "theme-dark" : "theme-light";
}

export function applyChrome(resolved: ResolvedTheme) {
  const chrome = resolved === "dark" ? DARK_CHROME : LIGHT_CHROME;
  try {
    Taro.setNavigationBarColor({
      frontColor: chrome.navFront,
      backgroundColor: chrome.navBg,
      animation: { duration: 160, timingFunc: "easeInOut" },
    });
  } catch {
    /* custom nav pages still accept this for status-bar glyphs */
  }
  try {
    Taro.setBackgroundColor({
      backgroundColor: chrome.pageBg,
      backgroundColorTop: chrome.pageBg,
      backgroundColorBottom: chrome.pageBg,
    });
  } catch {
    /* h5 */
  }
  try {
    Taro.setBackgroundTextStyle({ textStyle: chrome.textStyle });
  } catch {
    /* h5 */
  }
  try {
    Taro.setTabBarStyle({
      color: chrome.tabColor,
      selectedColor: chrome.tabSelected,
      backgroundColor: chrome.tabBg,
      borderStyle: chrome.border,
    });
  } catch {
    /* login page has no tab bar */
  }
}

export function statusBarPad() {
  return customNavInset().paddingTop;
}

export type CustomNavInset = {
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  rowHeight: number;
};

/** Custom-nav inset: keep content left of the WeChat capsule, aligned to its row. */
export function customNavInset(): CustomNavInset {
  const fallback: CustomNavInset = {
    paddingTop: 12,
    paddingRight: 104,
    paddingBottom: 8,
    rowHeight: 32,
  };
  try {
    const sys = Taro.getSystemInfoSync();
    const status = Number(sys.statusBarHeight || 0);
    const safe = Number(sys.safeArea?.top || 0);
    const windowWidth = Number(sys.windowWidth || 0);
    let menu: { top?: number; height?: number; left?: number } = {};
    try {
      menu = Taro.getMenuButtonBoundingClientRect() || {};
    } catch {
      menu = {};
    }
    const menuTop = Number(menu.top || 0);
    const menuHeight = Number(menu.height || 0);
    const menuLeft = Number(menu.left || 0);
    const paddingTop = Math.max(fallback.paddingTop, menuTop || status || safe);
    const rowHeight = menuHeight > 0 ? menuHeight : fallback.rowHeight;
    const paddingBottom =
      menuTop > 0 && status > 0 ? Math.max(6, menuTop - status) : fallback.paddingBottom;
    const paddingRight =
      menuLeft > 0 && windowWidth > menuLeft
        ? windowWidth - menuLeft + 8
        : fallback.paddingRight;
    return { paddingTop, paddingRight, paddingBottom, rowHeight };
  } catch {
    return fallback;
  }
}

export function usePageTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredPreference()));

  const sync = useCallback(() => {
    const pref = readStoredPreference();
    const next = resolveTheme(pref);
    setPreferenceState(pref);
    setResolved(next);
    applyChrome(next);
  }, []);

  useDidShow(() => {
    sync();
  });

  const cycleDayNight = useCallback(() => {
    setResolved((current) => {
      const nextPref: ThemePreference = current === "dark" ? "light" : "dark";
      writeStoredPreference(nextPref);
      applyChrome(nextPref);
      setPreferenceState(nextPref);
      return nextPref;
    });
  }, []);

  return {
    preference,
    resolved,
    isDark: resolved === "dark",
    className: themeClass(resolved),
    cycleDayNight,
    sync,
  };
}
