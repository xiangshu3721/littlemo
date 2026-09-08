"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconClose, IconImage, IconPlus, IconSend } from "@/components/InkIcons";
import { compressImage } from "@/lib/image";
import { LIMITS } from "@/lib/limits";
import { useStore } from "@/context/store";

export function Composer() {
  const { addTurn, requestInsight, liveSessions, liveMessages } = useStore();
  const [text, setText] = useState("");
  const [image, setImage] = useState<Blob>();
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [openPlus, setOpenPlus] = useState(false);
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(
    () => (image ? URL.createObjectURL(image) : undefined),
    [image],
  );

  const canInsight = useMemo(() => {
    return liveSessions.some(
      (s) =>
        !s.endedAt &&
        !s.deletedAt &&
        liveMessages.some((m) => m.sessionId === s.id && m.role === "user" && m.text.trim()),
    );
  }, [liveSessions, liveMessages]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  async function onFile(file?: File) {
    if (!file) return;
    setOpenPlus(false);
    try {
      setImage(await compressImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片读不进去");
    }
  }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed && !image) return;
    const sendingImage = image;
    setSending(true);
    setError("");
    setText("");
    setImage(undefined);
    try {
      await addTurn({ text: trimmed.slice(0, LIMITS.latestChars), image: sendingImage });
    } catch (err) {
      setText(trimmed);
      setImage(sendingImage);
      setError(err instanceof Error ? err.message : "没发出去");
    } finally {
      setSending(false);
      area.current?.focus();
    }
  }

  async function closeAndInsight() {
    if (!canInsight || closing) return;
    setClosing(true);
    setError("");
    try {
      await requestInsight();
    } catch (err) {
      setError(err instanceof Error ? err.message : "没收进去");
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-1">
      <div className="hairline mb-3" />
      {canInsight ? (
        <button
          type="button"
          disabled={closing || sending}
          onClick={() => void closeAndInsight()}
          className="mb-2.5 w-full py-2 text-center text-[13px] leading-5 tracking-wide text-ink-soft active:scale-[0.99] disabled:opacity-50"
        >
          {closing ? "正在收这段…" : "就聊到这，帮我深度洞察下这段情绪"}
        </button>
      ) : null}
      {preview ? (
        <div className="mb-2 flex items-start gap-2 px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-16 w-16 rounded-xl object-cover" />
          <button type="button" onClick={() => setImage(undefined)} className="text-ink-soft" aria-label="去掉这张图">
            <IconClose className="h-[18px] w-[18px]" />
          </button>
        </div>
      ) : null}
      {error ? <p className="mb-1 px-1 text-[12px] text-danger">{error}</p> : null}
      {openPlus ? (
        <div className="mb-2 flex gap-2 px-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-full bg-wash px-3.5 py-2 text-[13px] tracking-wide text-ink"
          >
            <IconImage className="h-[18px] w-[18px]" />
            照片
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setOpenPlus((v) => !v)}
          className="mb-1 grid h-11 w-11 place-items-center rounded-full text-ink-soft active:scale-[0.98]"
          aria-label="附件"
        >
          <IconPlus className="h-[22px] w-[22px]" />
        </button>
        <textarea
          ref={area}
          rows={1}
          name="note"
          id="composer-note"
          maxLength={LIMITS.latestChars}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, LIMITS.latestChars))}
          placeholder="想说就说…"
          className="max-h-[140px] min-h-11 flex-1 resize-none rounded-[22px] bg-surface px-3.5 py-2.5 text-[15px] leading-5 text-ink outline-none placeholder:text-ink-faint shadow-[inset_0_0_0_1px_var(--line)]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || (!text.trim() && !image)}
          className="send-pop mb-1 grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-ink disabled:bg-wash disabled:text-ink-faint"
          aria-label="发送"
        >
          <IconSend className="h-[18px] w-[18px]" />
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}
