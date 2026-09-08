"use client";

import { StoreProvider } from "@/context/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}
