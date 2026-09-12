"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  ColumnBars,
  DeltaBars,
  IntensityRail,
  RankBars,
  ShareRing,
  TrendChart,
} from "@/components/InsightCharts";
import { useStore } from "@/context/store";
import { periodBox, previousBox } from "@/lib/dates";
import { buildPeriodStats, kindLabel, sessionsInRange, toPayload } from "@/lib/period-stats";
import type { PeriodKind, PeriodReport, PeriodTrigger } from "@/lib/types";

function asMe(text: string) {
  return text
    .replace(/这位用户/g, "我")
    .replace(/该用户/g, "我")
    .replace(/用户/g, "我")
    .trim();
}

function Plate() {
  return (
    <div className="ink-wash mb-6 flex h-[132px] items-end overflow-hidden rounded-[20px] px-5 pb-4">
      <div>
        <p className="chapter-mark">看见，而不是计数</p>
        <p className="mt-1 font-display text-[18px] font-medium tracking-wide text-ink">这一段日子的纸面</p>
      </div>
    </div>
  );
}

export default function InsightPage() {
  const { liveSessions, liveMessages, ready, loadReport, saveReport } = useStore();
  const [kind, setKind] = useState<PeriodKind>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openTrigger, setOpenTrigger] = useState<string | null>(null);

  const period = periodBox(kind, cursor);
  const prev = previousBox(kind, period.startDay, period.endDay);
  const currentSessions = useMemo(
    () => sessionsInRange(liveSessions, liveMessages, period.startDay, period.endDay),
    [liveSessions, liveMessages, period.startDay, period.endDay],
  );
  const previousSessions = useMemo(
    () => sessionsInRange(liveSessions, liveMessages, prev.startDay, prev.endDay),
    [liveSessions, liveMessages, prev.startDay, prev.endDay],
  );
  const stats = useMemo(
    () => buildPeriodStats(currentSessions, previousSessions, period.startDay, period.endDay),
    [currentSessions, previousSessions, period.startDay, period.endDay],
  );

  const requestReport = useCallback(
    async (force: boolean) => {
      if (!stats.count) return;
      setBusy(true);
      setError("");
      try {
        if (!force) {
          const cached = await loadReport(period.id);
          if (cached) {
            setReport(cached);
            const latestEnd = Math.max(0, ...currentSessions.map((s) => s.endedAt || 0));
            const rich = Boolean(cached.unseen?.length || cached.panorama || cached.loop);
            if (rich && cached.generatedAt >= latestEnd) return;
          }
        }
        const res = await fetch("/api/period", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            label: period.label,
            digest: stats.digest,
            entries: toPayload(currentSessions, liveMessages),
          }),
        });
        const data = (await res.json()) as {
          report?: Omit<PeriodReport, "id" | "kind" | "label" | "generatedAt">;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "分析失败");
        const next: PeriodReport = {
          id: period.id,
          kind,
          label: period.label,
          generatedAt: Date.now(),
          ...data.report!,
        };
        await saveReport(next);
        setReport(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "分析失败");
      } finally {
        setBusy(false);
      }
    },
    [currentSessions, kind, liveMessages, loadReport, period.id, period.label, saveReport, stats.count, stats.digest],
  );

  useEffect(() => {
    if (!ready || !stats.count) return;
    const timer = window.setTimeout(() => void requestReport(false), 0);
    return () => window.clearTimeout(timer);
  }, [ready, period.id, stats.count, requestReport]);

  const tags = (report?.highFrequency.length ? report.highFrequency : stats.top).slice(0, 5);
  const triggers: PeriodTrigger[] = report?.triggers?.length ? report.triggers : [];
  const rhythms = report?.rhythms;
  const hasRhythm = Boolean(
    rhythms?.time || rhythms?.weekday || rhythms?.scene || rhythms?.people || rhythms?.event || report?.patterns,
  );
  const unseen =
    report?.unseen?.length
      ? report.unseen
      : report?.insight
        ? [{ title: "你可能没有注意到", body: report.insight }]
        : [];
  const growth = report?.growth?.length ? report.growth : stats.compare;

  return (
    <AppShell title="情绪洞察">
      <div className="feed-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1">
        <div className="mb-4 flex gap-2">
          {(["week", "month", "days90"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                if (k === "month") setCursor(new Date());
              }}
              className={`pill ${kind === k ? "pill-on" : "pill-off"}`}
            >
              {kindLabel(k)}
            </button>
          ))}
        </div>
        {kind === "month" ? (
          <div className="mb-4 flex items-center gap-3 text-[13px] text-ink-soft">
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              上个月
            </button>
            <span className="text-ink">{period.label}</span>
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              下个月
            </button>
          </div>
        ) : (
          <p className="mb-4 text-[13px] text-ink-faint">{period.label}</p>
        )}

        {busy ? (
          <p className="mb-4 text-[13px] tracking-wide text-ink-faint">正在把这段日子看清楚…</p>
        ) : error ? (
          <p className="mb-4 text-[13px] leading-6 text-danger">
            {error}
            <button type="button" className="ml-2 tracking-wide text-accent" onClick={() => void requestReport(true)}>
              再试一次
            </button>
          </p>
        ) : (
          <span className="sr-only">这段日子的规律已展开</span>
        )}

        {!stats.count ? (
          <p className="pt-6 text-[14px] leading-7 text-ink-soft">
            点「就聊到这」把段落收进日记后，这里会帮我从一堆记录里看见规律：不是数我焦虑了几次，而是弄清我的情绪为什么这样发生。
          </p>
        ) : (
          <div className="space-y-12">
            <Plate />

            <section>
              <p className="chapter-mark">一</p>
              <h2 className="mt-1 font-display text-[18px] font-medium tracking-wide text-ink">我的情绪全景</h2>
              <div className="sheet mt-4 px-4 py-4">
                <ShareRing
                  count={stats.count}
                  positive={stats.positiveShare || 0}
                  negative={stats.negativeShare || 0}
                  mixed={stats.mixedShare || 0}
                />
                {stats.avgIntensity != null ? (
                  <div className="mt-5 border-t border-line/40 pt-4">
                    <IntensityRail value={stats.avgIntensity} />
                  </div>
                ) : null}
              </div>
              {report?.panorama ? (
                <p className="mt-3 text-[14px] leading-7 text-ink-soft">{asMe(report.panorama)}</p>
              ) : (
                <p className="mt-3 text-[13px] leading-6 text-ink-faint">
                  {busy ? "正在写下我对这段日子的看法。" : "环里是这段日子的构成，点上是平均强度。"}
                </p>
              )}
              <div className="sheet mt-4 px-3 py-3">
                <p className="mb-1 px-1 text-[13px] text-ink-soft">情绪状态</p>
                <TrendChart points={stats.trend} />
                {report?.trendNote ? (
                  <p className="mt-2 px-1 text-[14px] leading-7 text-ink">{asMe(report.trendNote)}</p>
                ) : null}
              </div>
            </section>

            <section>
              <p className="chapter-mark">二</p>
              <h2 className="mt-1 font-display text-[18px] font-medium tracking-wide text-ink">我最近最常出现</h2>
              <div className="sheet mt-3 px-4 py-4">
                <RankBars rows={tags} />
              </div>
              {report?.topNote ? (
                <p className="mt-3 text-[14px] leading-7 text-ink">{asMe(report.topNote)}</p>
              ) : (
                <p className="mt-3 text-[13px] text-ink-faint">
                  {busy ? "正在看排名背后反复出现的是什么。" : "图表是次数，句子是它为什么总出现。"}
                </p>
              )}
            </section>

            <section>
              <p className="chapter-mark">三</p>
              <h2 className="mt-1 font-display text-[18px] font-medium tracking-wide text-ink">我的情绪规律</h2>
              <div className="sheet mt-3 space-y-4 px-4 py-4">
                <ColumnBars rows={stats.hourBuckets} label="一天里，情绪落在哪" />
                <ColumnBars rows={stats.weekdayBuckets} label="一星期里，哪天更密" />
              </div>
              {hasRhythm ? (
                <ul className="mt-3 space-y-3 text-[14px] leading-7 text-ink-soft">
                  {rhythms?.time ? <li>{asMe(rhythms.time)}</li> : null}
                  {rhythms?.weekday ? <li>{asMe(rhythms.weekday)}</li> : null}
                  {rhythms?.scene ? <li>{asMe(rhythms.scene)}</li> : null}
                  {rhythms?.people ? <li>{asMe(rhythms.people)}</li> : null}
                  {rhythms?.event ? <li>{asMe(rhythms.event)}</li> : null}
                  {!rhythms?.time && report?.patterns ? <li>{asMe(report.patterns)}</li> : null}
                </ul>
              ) : (
                <p className="mt-3 text-[13px] text-ink-faint">
                  {busy ? "正在对照时间、场景和事件。" : "柱子是时间分布。场景、人和事件会写在下面。"}
                </p>
              )}
            </section>

            <section>
              <p className="chapter-mark">四</p>
              <h2 className="mt-1 font-display text-[18px] font-medium tracking-wide text-ink">情绪触发器</h2>
              {triggers.length ? (
                <div className="sheet mt-3 px-4 py-4">
                  <RankBars
                    rows={triggers.map((t) => ({ name: t.name, count: t.count }))}
                    onSelect={(name) => setOpenTrigger((cur) => (cur === name ? null : name))}
                  />
                  {openTrigger ? (
                    <div className="mt-3 space-y-1 border-t border-line/40 pt-3 text-[13px] leading-6 text-ink-soft">
                      {triggers
                        .filter((t) => t.name === openTrigger)
                        .map((row) => (
                          <div key={row.name}>
                            {row.chain ? <p>常伴随：{asMe(row.chain)}</p> : null}
                            {row.scenes ? <p>场景：{asMe(row.scenes)}</p> : null}
                            {row.behaviors ? <p>行为：{asMe(row.behaviors)}</p> : null}
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-ink-faint">触发地图会标出最容易带动我的事、人和场景。</p>
              )}
            </section>

            <section>
              <p className="chapter-mark">五</p>
              <h2 className="mt-1 font-display text-[18px] font-medium tracking-wide text-ink">我反复出现的模式</h2>
              {report?.loop?.steps?.length ? (
                <div className="mt-3">
                  <p className="text-[15px] font-medium text-ink">{asMe(report.loop.title)}</p>
                  <div className="mt-2">
                    {report.loop.steps.map((step, index) => (
                      <div key={`${step}-${index}`}>
                        {index > 0 ? (
                          <p className="py-1 text-center text-[12px] text-ink-faint" aria-hidden>
                            ↓
                          </p>
                        ) : null}
                        <p className="rounded-[16px] bg-wash px-3 py-2 text-[14px] leading-6 text-ink-soft">{asMe(step)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-ink-faint">
                  我会把反复出现的路画出来：事件 → 情绪 → 想法 → 行为 → 结果。这比知道自己焦虑更有用。
                </p>
              )}
            </section>

            <section>
              <p className="chapter-mark">六</p>
              <h2 className="mt-1 font-display text-[18px] font-medium tracking-wide text-ink">你可能没有注意到</h2>
              {unseen.length ? (
                <ol className="mt-3 space-y-5">
                  {unseen.map((row, index) => (
                    <li key={`${row.title}-${index}`}>
                      <p className="text-[15px] font-medium leading-6 text-ink">{asMe(row.title)}</p>
                      <p className="mt-1 text-[14px] leading-7 text-ink-soft">{asMe(row.body)}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-[13px] text-ink-faint">这里是整页最重要的一块：从我已经说过的话里，找出我自己没看见的东西。</p>
              )}
            </section>

            <section>
              <p className="chapter-mark">七</p>
              <h2 className="mt-1 font-display text-[18px] font-medium tracking-wide text-ink">我正在发生什么变化</h2>
              {growth.length ? (
                <div className="sheet mt-3 px-4 py-4">
                  <DeltaBars rows={growth} />
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-ink-faint">对照上一段日子，看我是不是真的有在长大。</p>
              )}
              {report?.growthNote || report?.encouragement ? (
                <p className="mt-3 text-[14px] leading-7 text-ink">
                  {asMe(report.growthNote || report.encouragement || "")}
                </p>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
