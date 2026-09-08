"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { formatDayLabel } from "@/lib/dates";
import { isArchiveMark } from "@/lib/guide";
import { useStore } from "@/context/store";
import type { Message } from "@/lib/types";
import { ChatBubble } from "./ChatBubble";
import { EmptyState } from "./EmptyState";
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
      <EmptyState
        title="去记下这一刻"
        body="无论乱、轻，还是说不清，都可以放在这里。不评判、不催促，我只轻轻陪着你，把这一刻安放好。"
      />
    );
  }

  return (
    <div ref={scroller} className="feed-scroll min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-4 py-5">
      {grouped.map(([day, items]) => (
        <section key={day} className="space-y-3.5">
          <h2 className="flex items-center justify-center gap-3 text-center font-display text-[12px] tracking-[0.18em] text-ink-faint">
            <span className="h-px w-8 bg-line/80" />
            {formatDayLabel(day)}
            <span className="h-px w-8 bg-line/80" />
          </h2>
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
                  <p className="pt-1 text-center text-[11px] tracking-[0.12em] text-ink-faint">
                    这段已收进情绪日记，深度洞察可在日记里展开
                  </p>
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
