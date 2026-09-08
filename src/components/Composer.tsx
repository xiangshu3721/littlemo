"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageSquare, PaperPlaneTilt, Plus, X } from "@phosphor-icons/react";
import { compressImage } from "@/lib/image";
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
      await addTurn({ text: trimmed, image: sendingImage });
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
    <div className="px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="hairline mb-2.5" />
      {canInsight ? (
        <button
          type="button"
          disabled={closing || sending}
          onClick={() => void closeAndInsight()}
          className="mb-2.5 w-full rounded-full px-3 py-2 text-center text-[13px] leading-5 text-ink-soft shadow-[inset_0_0_0_1px_var(--line)] active:scale-[0.99] disabled:opacity-50"
        >
          {closing ? "正在收这段…" : "就聊到这，帮我深度洞察下这段情绪"}
        </button>
      ) : null}
      {preview ? (
        <div className="mb-2 flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-16 w-16 rounded-xl object-cover" />
          <button type="button" onClick={() => setImage(undefined)} className="text-ink-soft">
            <X size={18} />
          </button>
        </div>
      ) : null}
      {error ? <p className="mb-1 text-[12px] text-[#8A3A2A]">{error}</p> : null}
      {openPlus ? (
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-2xl bg-wash px-3 py-2 text-[13px] text-ink"
          >
            <ImageSquare size={18} />
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
          <Plus size={22} weight={openPlus ? "bold" : "regular"} />
        </button>
        <textarea
          ref={area}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="想说就说…"
          className="max-h-[140px] min-h-11 flex-1 resize-none rounded-[22px] bg-wash px-3.5 py-2.5 text-[15px] leading-5 text-ink outline-none placeholder:text-ink-faint"
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
          className="mb-1 grid h-11 w-11 place-items-center rounded-full bg-accent text-[#f7f3ea] disabled:bg-wash disabled:text-ink-faint active:scale-[0.98]"
          aria-label="发送"
        >
          <PaperPlaneTilt size={18} weight="fill" />
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}
