"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/context/store";
import { formatDayLabel, formatClock } from "@/lib/dates";

export default function TrashPage() {
  const { trashSessions, restore, purge } = useStore();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <AppShell title="回收站">
      <div className="feed-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {trashSessions.length === 0 ? (
          <EmptyState title="回收站是空的" body="从日记里放到这里的段落，还可以放回去。彻底删除后就找不回来了。" />
        ) : (
          <ul className="space-y-3">
            {trashSessions.map((s) => (
              <li key={s.id} className="sheet px-4 py-3.5">
                <p className="text-[12px] tracking-wide text-ink-faint">
                  {formatDayLabel(s.day)} {formatClock(s.startedAt)}
                </p>
                <p className="mt-1 line-clamp-3 text-[14px] leading-7 text-ink">
                  {s.title || "一段记录"}
                </p>
                <div className="mt-3 flex gap-5 text-[13px] tracking-wide">
                  <button type="button" className="text-accent" onClick={() => restore(s.id)}>
                    放回去
                  </button>
                  {confirmId === s.id ? (
                    <button
                      type="button"
                      className="text-danger"
                      onClick={() => {
                        void purge(s.id);
                        setConfirmId(null);
                      }}
                    >
                      确认彻底删除
                    </button>
                  ) : (
                    <button type="button" className="text-ink-faint" onClick={() => setConfirmId(s.id)}>
                      彻底删除
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
