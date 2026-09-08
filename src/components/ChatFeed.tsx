"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { formatDayLabel } from "@/lib/dates";
import { isArchiveMark } from "@/lib/guide";
import { useStore } from "@/context/store";
import type { Message } from "@/lib/types";
import { ChatBubble } from "./ChatBubble";
import { GuideChips } from "./GuideChips";

export function ChatFeed({ messages = [] }: { messages: Message[] }) {
  const { liveSessions } = useStore();
  const scroller = useRef<HTMLDivElement>(null);
  const last = messages.at(-1);
  const endedById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const session of liveSessions) {
      map.set(session.id, Boolean(session.endedAt));
    }
    return map;
  }, [liveSessions]);
  const grouped = useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const message of messages) {
      const list = map.get(message.day) || [];
      list.push(message);
      map.set(message.day, list);
    }
    return [...map.entries()];
  }, [messages]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, last?.pending, last?.text]);

  if (!messages.length) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-8 text-center">
        <p className="font-display text-[22px] font-medium tracking-tight text-ink">去记下这一刻</p>
        <p className="mt-3 max-w-[16rem] text-[14px] leading-7 text-ink-soft">
          想说就说。我陪你往里看一步，不急着分段，也不拿问卷问你。
        </p>
      </div>
    );
  }

  return (
    <div ref={scroller} className="feed-scroll min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4">
      {grouped.map(([day, items]) => (
        <section key={day} className="space-y-3">
          <h2 className="text-center font-display text-[12px] tracking-[0.14em] text-ink-faint">{formatDayLabel(day)}</h2>
          {items.map((message, index) => {
            const next = items[index + 1];
            const archived =
              isArchiveMark(message.text) ||
              (endedById.get(message.sessionId) && (!next || next.sessionId !== message.sessionId));
            const isLatest = message.id === last?.id;
            return (
              <div key={message.id} className="space-y-3">
                {isArchiveMark(message.text) && message.role === "assistant" ? null : (
                  <>
                    <ChatBubble message={message} />
                    <GuideChips message={message} isLatest={Boolean(isLatest)} />
                  </>
                )}
                {archived ? (
                  <p className="text-center text-[11px] tracking-wide text-ink-faint">这段已收进情绪日记，深度洞察可在日记里展开</p>
                ) : null}
              </div>
            );
          })}
        </section>
      ))}
      <div />
    </div>
  );
}
