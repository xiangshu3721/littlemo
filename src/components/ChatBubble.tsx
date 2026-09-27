"use client";

import { useEffect, useMemo } from "react";
import type { Message } from "@/lib/types";
import { formatClock } from "@/lib/dates";
import { useStore } from "@/context/store";

export function ChatBubble({
  message,
  continued = false,
  hideTime = false,
}: {
  message: Message;
  continued?: boolean;
  hideTime?: boolean;
}) {
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
      <div className="flex items-start justify-start gap-2">
        <CoachMark />
        <div className="bubble-stroke rounded-[20px] rounded-bl-[6px] bg-bubble-coach px-4 py-3">
          <p className="text-[13px] tracking-wide text-ink-soft">在听…</p>
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
      <div className="flex items-start justify-start gap-2">
        <CoachMark />
        <div className="bubble-stroke max-w-[88%] rounded-[20px] rounded-bl-[6px] bg-bubble-coach px-4 py-3.5">
          <p className="text-[13px] leading-6 text-ink-soft">{message.error}</p>
          <button
            type="button"
            onClick={() => retryTurn(message.id)}
            className="mt-2 text-[13px] font-medium tracking-wide text-accent"
          >
            再试一次
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {mine ? null : continued ? <span className="mt-0.5 h-8 w-8 shrink-0" /> : <CoachMark />}
      <div className="max-w-[82%]">
        <div
          className={`bubble-stroke px-3.5 py-2.5 text-[15px] leading-[1.7] break-words text-ink [overflow-wrap:anywhere] ${
            mine
              ? "rounded-[20px] rounded-br-[6px] bg-bubble"
              : "rounded-[20px] rounded-bl-[6px] bg-bubble-coach"
          }`}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="mb-2 max-h-52 w-full rounded-[14px] object-cover" />
          ) : null}
          {message.text ? <p className="whitespace-pre-wrap">{message.text}</p> : null}
        </div>
        {hideTime ? null : (
          <p className={`mt-1 text-[11px] tracking-wide text-ink-faint ${mine ? "text-right" : "pl-0.5"}`}>
            {formatClock(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function CoachMark() {
  const { profile } = useStore();
  const initial = profile.nickname.slice(0, 1);
  return (
    <span className="mt-0.5 grid h-8 w-8 shrink-0 overflow-hidden rounded-full bg-wash shadow-[inset_0_0_0_1px_var(--line)]">
      {profile.avatarDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center font-display text-[13px] text-ink-soft">
          {initial}
        </span>
      )}
    </span>
  );
}
