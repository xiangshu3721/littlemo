"use client";

import { useEffect, useMemo } from "react";
import type { Message } from "@/lib/types";
import { formatClock } from "@/lib/dates";
import { useStore } from "@/context/store";

export function ChatBubble({ message }: { message: Message }) {
  const { retryTurn } = useStore();
  const imageUrl = useMemo(
    () => (message.image ? URL.createObjectURL(message.image) : undefined),
    [message.image],
  );

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const mine = message.role === "user";

  if (message.pending) {
    return (
      <div className="flex justify-start">
        <div className="rounded-[22px] rounded-bl-sm bg-white px-4 py-3 shadow-[0_10px_28px_rgba(48,38,28,0.06)]">
          <p className="text-[13px] text-ink-soft">回复中……</p>
          <div className="mt-2 flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:240ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%] rounded-[22px] rounded-bl-sm bg-white px-4 py-3.5 shadow-[0_10px_28px_rgba(48,38,28,0.06)]">
          <p className="text-[13px] leading-5 text-ink-soft">{message.error}</p>
          <button
            type="button"
            onClick={() => retryTurn(message.id)}
            className="mt-2 text-[13px] font-medium text-accent"
          >
            再试一次
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] px-3.5 py-2.5 text-[15px] leading-[1.65] text-ink shadow-[0_10px_28px_rgba(48,38,28,0.06)] ${
          mine
            ? "rounded-[22px] rounded-br-sm bg-bubble"
            : "rounded-[22px] rounded-bl-sm bg-white"
        }`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="mb-2 max-h-52 w-full rounded-2xl object-cover" />
        ) : null}
        {message.text ? <p className="whitespace-pre-wrap">{message.text}</p> : null}
        <p className={`mt-1 text-[11px] text-ink-faint ${mine ? "text-right" : ""}`}>
          {formatClock(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
