"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  applyDocumentTheme,
  msUntilThemeBoundary,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeStore = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeStore | null>(null);

function initialPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  return readStoredPreference();
}

function initialResolved(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return resolveTheme(readStoredPreference());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(initialResolved);

  useLayoutEffect(() => {
    applyDocumentTheme(resolved, preference);
    document.documentElement.classList.add("theme-animate");
  }, [preference, resolved]);

  useEffect(() => {
    if (preference !== "system") return;
    const tick = () => {
      const next = resolveTheme("system");
      setResolved(next);
      applyDocumentTheme(next, "system");
    };
    const id = window.setTimeout(tick, msUntilThemeBoundary());
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [preference, resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    const resolvedNext = resolveTheme(next);
    setPreferenceState(next);
    setResolved(resolvedNext);
    writeStoredPreference(next);
    applyDocumentTheme(resolvedNext, next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("Theme missing");
  return ctx;
}
