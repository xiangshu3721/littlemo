"use client";

import { AppShell } from "@/components/AppShell";
import { useStore } from "@/context/store";
import { formatDayLabel, formatClock } from "@/lib/dates";

export default function TrashPage() {
  const { trashSessions, restore, purge } = useStore();
  return (
    <AppShell title="回收站">
      <div className="feed-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {trashSessions.length === 0 ? (
          <p className="pt-10 text-center text-[14px] text-ink-soft">回收站是空的。</p>
        ) : (
          <ul className="space-y-3">
            {trashSessions.map((s) => (
              <li key={s.id} className="sheet px-4 py-3.5">
                <p className="text-[12px] text-ink-faint">
                  {formatDayLabel(s.day)} {formatClock(s.startedAt)}
                </p>
                <p className="mt-1 line-clamp-3 text-[14px] leading-6 text-ink">
                  {s.title || "一段记录"}
                </p>
                <div className="mt-2 flex gap-4 text-[13px]">
                  <button type="button" className="text-accent" onClick={() => restore(s.id)}>
                    放回去
                  </button>
                  <button type="button" className="text-ink-faint" onClick={() => purge(s.id)}>
                    彻底删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
