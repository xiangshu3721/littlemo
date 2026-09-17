import { View, Text, Button } from "@tarojs/components";
import { useCallback, useEffect, useMemo, useState } from "react";
import { periodBox, previousBox } from "../../utils/diary-dates";
import { asMe } from "../../utils/diary-moods";
import { liveMessages, loadReport, requestPeriodReport } from "../../utils/diary-store";
import type { PeriodKind, PeriodReport, PeriodTrigger, Session } from "../../utils/diary-types";
import { buildPeriodStats, kindLabel, sessionsInRange, toPayload, type EmotionCount, type TrendPoint } from "../../utils/period-stats";

function Plate() {
  return (
    <View className="plate">
      <Text className="chapter-mark">看见，而不是计数</Text>
      <Text className="plate__title">这一段日子的纸面</Text>
    </View>
  );
}

function ShareRing({
  positive,
  negative,
  mixed,
  count,
}: {
  positive: number;
  negative: number;
  mixed: number;
  count: number;
}) {
  return (
    <View className="ring">
      <View className="ring__count">
        <Text className="ring__num">{count}</Text>
        <Text className="ring__unit">段</Text>
      </View>
      <View className="ring__legend">
        {[
          { name: "负向", value: negative, tone: "ink" },
          { name: "正向", value: positive, tone: "accent" },
          { name: "说不清", value: mixed, tone: "wash" },
        ].map((row) => (
          <View key={row.name} className="ring__row">
            <View className="ring__left">
              <View className={`dot dot--${row.tone}`} />
              <Text className="ring__name">{row.name}</Text>
            </View>
            <Text className="ring__value">{row.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function IntensityRail({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <View className="rail">
      <View className="rail__head">
        <Text className="rail__label">情绪强度</Text>
        <Text className="rail__value">{value}/10</Text>
      </View>
      <View className="rail__track">
        <View className="rail__fill" style={{ width: `${pct}%` }} />
        <View className="rail__knob" style={{ left: `${pct}%` }} />
      </View>
      <View className="rail__ends">
        <Text>轻</Text>
        <Text>重</Text>
      </View>
    </View>
  );
}

function RankBars({
  rows,
  onSelect,
}: {
  rows: EmotionCount[];
  onSelect?: (name: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <View>
      {rows.map((row, index) => (
        <View key={row.name} className="rank" onClick={() => onSelect?.(row.name)}>
          <View className="rank__head">
            <Text className="rank__name">
              <Text className="rank__idx">{String(index + 1).padStart(2, "0")}</Text>
              {row.name}
            </Text>
            <Text className="rank__count">{row.count}</Text>
          </View>
          <View className="rank__track">
            <View
              className="rank__fill"
              style={{
                width: `${Math.max(6, (row.count / max) * 100)}%`,
                opacity: 1 - index * 0.12,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function ColumnBars({ rows, label }: { rows: { name: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <View className="cols">
      <Text className="cols__label">{label}</Text>
      <View className="cols__row">
        {rows.map((row) => {
          const h = row.count ? Math.max(8, (row.count / max) * 100) : 3;
          return (
            <View key={row.name} className="cols__item">
              <Text className="cols__n">{row.count || ""}</Text>
              <View
                className={`cols__bar ${row.count ? "cols__bar--on" : ""}`}
                style={{ height: `${h}%` }}
              />
              <Text className="cols__name">{row.name.replace("周", "")}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DeltaBars({ rows }: { rows: { name: string; delta: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.delta)));
  return (
    <View>
      {rows.map((row) => {
        const width = (Math.abs(row.delta) / max) * 48;
        const up = row.delta > 0;
        const w = Math.max(row.delta === 0 ? 0 : 8, width);
        return (
          <View key={row.name} className="delta">
            <Text className="delta__name">{row.name}</Text>
            <View className="delta__track">
              <View className="delta__mid" />
              <View
                className={`delta__fill ${up ? "delta__fill--up" : "delta__fill--down"}`}
                style={{
                  width: `${w}%`,
                  left: up ? "50%" : `calc(50% - ${w}%)`,
                }}
              />
            </View>
            <Text className="delta__num">
              {row.delta === 0 ? "持平" : `${up ? "+" : "−"}${Math.abs(row.delta)}%`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function TrendBars({ points }: { points: TrendPoint[] }) {
  const usable = points.filter((p) => p.score != null);
  if (!usable.length) {
    return <Text className="trend__empty">日子还太短，看不出走势</Text>;
  }
  return (
    <View className="trend">
      {points.map((p) => (
        <View key={p.day} className="trend__col">
          <View
            className={`trend__bar ${p.score == null ? "trend__bar--empty" : ""}`}
            style={{ height: p.score == null ? "4px" : `${Math.max(8, (p.score / 10) * 100)}%` }}
          />
          {p.label ? <Text className="trend__lab">{p.label}</Text> : <Text className="trend__lab"> </Text>}
        </View>
      ))}
    </View>
  );
}

export function PeriodInsight({
  sessions,
  messages,
}: {
  sessions: Session[];
  messages: ReturnType<typeof liveMessages>;
}) {
  const [kind, setKind] = useState<PeriodKind>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openTrigger, setOpenTrigger] = useState<string | null>(null);

  const period = periodBox(kind, cursor);
  const prev = previousBox(kind, period.startDay, period.endDay);
  const currentSessions = useMemo(
    () => sessionsInRange(sessions, messages, period.startDay, period.endDay),
    [sessions, messages, period.startDay, period.endDay],
  );
  const previousSessions = useMemo(
    () => sessionsInRange(sessions, messages, prev.startDay, prev.endDay),
    [sessions, messages, prev.startDay, prev.endDay],
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
          const cached = loadReport(period.id);
          if (cached) {
            setReport(cached);
            const latestEnd = Math.max(0, ...currentSessions.map((s) => s.endedAt || 0));
            const rich = Boolean(cached.unseen?.length || cached.panorama || cached.loop);
            if (rich && cached.generatedAt >= latestEnd) return;
          }
        }
        const next = await requestPeriodReport({
          kind,
          label: period.label,
          periodId: period.id,
          digest: stats.digest,
          entries: toPayload(currentSessions, messages),
          force: true,
          latestEnd: Math.max(0, ...currentSessions.map((s) => s.endedAt || 0)),
        });
        setReport(next);
      } catch (err) {
        const cached = loadReport(period.id);
        if (cached) setReport(cached);
        setError(err instanceof Error ? err.message : "分析失败");
      } finally {
        setBusy(false);
      }
    },
    [currentSessions, kind, messages, period.id, period.label, stats.count, stats.digest],
  );

  useEffect(() => {
    if (!stats.count) {
      const timer = setTimeout(() => setReport(null), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => void requestReport(false), 0);
    return () => clearTimeout(timer);
  }, [period.id, stats.count, requestReport]);

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
    <View className="insight">
      <View className="pills">
        {(["week", "month", "days90"] as const).map((k) => (
          <Button
            key={k}
            className={`pill ${kind === k ? "pill--on" : ""}`}
            onClick={() => {
              setKind(k);
              if (k === "month") setCursor(new Date());
            }}
          >
            {kindLabel(k)}
          </Button>
        ))}
      </View>
      {kind === "month" ? (
        <View className="insight__month">
          <Button
            className="nav__ghost"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            上个月
          </Button>
          <Text className="insight__label">{period.label}</Text>
          <Button
            className="nav__ghost"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            下个月
          </Button>
        </View>
      ) : (
        <Text className="insight__faint">{period.label}</Text>
      )}

      {busy ? <Text className="insight__faint">正在把这段日子看清楚…</Text> : null}
      {error ? (
        <View className="insight__err">
          <Text>{error}</Text>
          <Button className="sheet__action" onClick={() => void requestReport(true)}>
            再试一次
          </Button>
        </View>
      ) : null}

      {!stats.count ? (
        <Text className="insight__empty">
          点「就聊到这」把段落收进日记后，这里会根据你的记录做人工智能整理，方便回看规律。这不是心理咨询或诊断。
        </Text>
      ) : (
        <View>
          <Plate />

          <View className="chapter">
            <Text className="chapter-mark">一</Text>
            <Text className="chapter__title">我的情绪全景</Text>
            <View className="sheet">
              <ShareRing
                count={stats.count}
                positive={stats.positiveShare || 0}
                negative={stats.negativeShare || 0}
                mixed={stats.mixedShare || 0}
              />
              {stats.avgIntensity != null ? (
                <View className="sheet__inner">
                  <IntensityRail value={stats.avgIntensity} />
                </View>
              ) : null}
            </View>
            {report?.panorama ? (
              <Text className="chapter__p">{asMe(report.panorama)}</Text>
            ) : (
              <Text className="insight__faint">
                {busy ? "正在写下我对这段日子的看法。" : "环里是这段日子的构成，点上是平均强度。"}
              </Text>
            )}
            <View className="sheet">
              <Text className="cols__label">情绪状态</Text>
              <TrendBars points={stats.trend} />
              {report?.trendNote ? <Text className="chapter__p">{asMe(report.trendNote)}</Text> : null}
            </View>
          </View>

          <View className="chapter">
            <Text className="chapter-mark">二</Text>
            <Text className="chapter__title">我最近最常出现</Text>
            <View className="sheet">
              <RankBars rows={tags} />
            </View>
            {report?.topNote ? (
              <Text className="chapter__p">{asMe(report.topNote)}</Text>
            ) : (
              <Text className="insight__faint">
                {busy ? "正在看排名背后反复出现的是什么。" : "图表是次数，句子是它为什么总出现。"}
              </Text>
            )}
          </View>

          <View className="chapter">
            <Text className="chapter-mark">三</Text>
            <Text className="chapter__title">我的情绪规律</Text>
            <View className="sheet">
              <ColumnBars rows={stats.hourBuckets} label="一天里，情绪落在哪" />
              <View className="sheet__gap" />
              <ColumnBars rows={stats.weekdayBuckets} label="一星期里，哪天更密" />
            </View>
            {hasRhythm ? (
              <View>
                {rhythms?.time ? <Text className="chapter__p">{asMe(rhythms.time)}</Text> : null}
                {rhythms?.weekday ? <Text className="chapter__p">{asMe(rhythms.weekday)}</Text> : null}
                {rhythms?.scene ? <Text className="chapter__p">{asMe(rhythms.scene)}</Text> : null}
                {rhythms?.people ? <Text className="chapter__p">{asMe(rhythms.people)}</Text> : null}
                {rhythms?.event ? <Text className="chapter__p">{asMe(rhythms.event)}</Text> : null}
                {!rhythms?.time && report?.patterns ? (
                  <Text className="chapter__p">{asMe(report.patterns)}</Text>
                ) : null}
              </View>
            ) : (
              <Text className="insight__faint">
                {busy ? "正在对照时间、场景和事件。" : "柱子是时间分布。场景、人和事件会写在下面。"}
              </Text>
            )}
          </View>

          <View className="chapter">
            <Text className="chapter-mark">四</Text>
            <Text className="chapter__title">情绪触发器</Text>
            {triggers.length ? (
              <View className="sheet">
                <RankBars
                  rows={triggers.map((t) => ({ name: t.name, count: t.count }))}
                  onSelect={(name) => setOpenTrigger((cur) => (cur === name ? null : name))}
                />
                {openTrigger
                  ? triggers
                      .filter((t) => t.name === openTrigger)
                      .map((row) => (
                        <View key={row.name} className="sheet__inner">
                          {row.chain ? <Text className="sheet__line">常伴随：{asMe(row.chain)}</Text> : null}
                          {row.scenes ? <Text className="sheet__line">场景：{asMe(row.scenes)}</Text> : null}
                          {row.behaviors ? <Text className="sheet__line">行为：{asMe(row.behaviors)}</Text> : null}
                        </View>
                      ))
                  : null}
              </View>
            ) : (
              <Text className="insight__faint">触发地图会标出最容易带动我的事、人和场景。</Text>
            )}
          </View>

          <View className="chapter">
            <Text className="chapter-mark">五</Text>
            <Text className="chapter__title">我反复出现的模式</Text>
            {report?.loop?.steps?.length ? (
              <View>
                <Text className="flow__title">{asMe(report.loop.title)}</Text>
                {report.loop.steps.map((step, index) => (
                  <View key={`${step}-${index}`}>
                    {index > 0 ? (
                      <Text className="flow__arrow" aria-hidden>
                        ↓
                      </Text>
                    ) : null}
                    <Text className="loop__step">{asMe(step)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="insight__faint">
                我会把反复出现的路画出来：事件 → 情绪 → 想法 → 行为 → 结果。这比知道自己焦虑更有用。
              </Text>
            )}
          </View>

          <View className="chapter">
            <Text className="chapter-mark">六</Text>
            <Text className="chapter__title">你可能没有注意到</Text>
            {unseen.length ? (
              unseen.map((row, index) => (
                <View key={`${row.title}-${index}`} className="unseen">
                  <Text className="flow__title">{asMe(row.title)}</Text>
                  <Text className="chapter__p">{asMe(row.body)}</Text>
                </View>
              ))
            ) : (
              <Text className="insight__faint">
                这里是整页最重要的一块：从我已经说过的话里，找出我自己没看见的东西。
              </Text>
            )}
          </View>

          <View className="chapter">
            <Text className="chapter-mark">七</Text>
            <Text className="chapter__title">我正在发生什么变化</Text>
            {growth.length ? (
              <View className="sheet">
                <DeltaBars rows={growth} />
              </View>
            ) : (
              <Text className="insight__faint">对照上一段日子，看我是不是真的有在长大。</Text>
            )}
            {report?.growthNote || report?.encouragement ? (
              <Text className="chapter__p">{asMe(report.growthNote || report.encouragement || "")}</Text>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}
