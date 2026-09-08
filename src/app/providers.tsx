"use client";

import { ThemeProvider } from "@/context/theme";
import { StoreProvider } from "@/context/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <StoreProvider>{children}</StoreProvider>
    </ThemeProvider>
  );
}
