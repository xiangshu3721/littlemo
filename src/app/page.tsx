"use client";

import { AppShell } from "@/components/AppShell";
import { ChatFeed } from "@/components/ChatFeed";
import { Composer } from "@/components/Composer";
import { useStore } from "@/context/store";

export default function HomePage() {
  const { liveMessages, ready, profile } = useStore();
  return (
    <AppShell title={profile.nickname} composer={<Composer />}>
      {ready ? (
        <ChatFeed messages={liveMessages} />
      ) : (
        <p className="p-10 text-center text-[13px] tracking-wide text-ink-faint">在打开本机记录…</p>
      )}
    </AppShell>
  );
}
