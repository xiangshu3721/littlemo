import type { EmotionCount, TrendPoint } from "@/lib/period-stats";

const INK = "var(--ink)";
const SOFT = "var(--ink-soft)";
const FAINT = "var(--ink-faint)";
const LINE = "var(--line)";
const ACCENT = "var(--accent)";
const WASH = "var(--wash)";
const PAPER = "var(--surface)";
const MIXED = "var(--chart-mixed)";

export function ShareRing({
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
  const slices = [
    { key: "负向", value: negative, color: INK },
    { key: "正向", value: positive, color: ACCENT },
    { key: "说不清", value: mixed, color: WASH },
  ].filter((s) => s.value > 0);
  const total = Math.max(1, negative + positive + mixed);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-[132px] w-[132px] shrink-0" role="img" aria-label="正负向构成">
        <circle cx="70" cy="70" r={r} fill="none" stroke={LINE} strokeWidth="16" />
        {slices.map((slice) => {
          const len = (slice.value / total) * c;
          const node = (
            <circle
              key={slice.key}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={slice.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return node;
        })}
        <text x="70" y="66" textAnchor="middle" fill={INK} fontSize="22" fontWeight="500">
          {count}
        </text>
        <text x="70" y="86" textAnchor="middle" fill={FAINT} fontSize="11">
          段
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2 text-[13px] text-ink-soft">
        {[
          { name: "负向", value: negative, color: INK },
          { name: "正向", value: positive, color: ACCENT },
          { name: "说不清", value: mixed, color: MIXED },
        ].map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
              {row.name}
            </span>
            <span className="tabular-nums text-ink">{row.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntensityRail({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-[13px]">
        <span className="text-ink-soft">情绪强度</span>
        <span className="tabular-nums text-[15px] font-medium text-ink">{value}/10</span>
      </div>
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-[18px] h-[3px] rounded-full bg-line" />
        <div
          className="absolute top-[18px] h-[3px] rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
        {Array.from({ length: 11 }, (_, i) => (
          <span
            key={i}
            className="absolute top-[14px] h-2.5 w-px bg-line"
            style={{ left: `${i * 10}%` }}
          />
        ))}
        <span
          className="absolute top-[8px] h-6 w-6 -translate-x-1/2 rounded-full border-2 border-surface bg-ink shadow-[var(--shadow)]"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-ink-faint">
        <span>轻</span>
        <span>重</span>
      </div>
    </div>
  );
}

export function RankBars({
  rows,
  onSelect,
}: {
  rows: EmotionCount[];
  onSelect?: (name: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-3">
      {rows.map((row, index) => {
        const bar = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-ink">
                <span className="mr-2 tabular-nums text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
                {row.name}
              </span>
              <span className="tabular-nums text-ink-soft">{row.count}</span>
            </div>
            <div className="h-[10px] overflow-hidden rounded-full bg-wash">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${Math.max(6, (row.count / max) * 100)}%`,
                  opacity: 1 - index * 0.12,
                }}
              />
            </div>
          </>
        );
        return (
          <li key={row.name}>
            {onSelect ? (
              <button type="button" className="w-full text-left" onClick={() => onSelect(row.name)}>
                {bar}
              </button>
            ) : (
              bar
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ColumnBars({
  rows,
  label,
}: {
  rows: { name: string; count: number }[];
  label: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div>
      <p className="mb-2 text-[13px] text-ink-soft">{label}</p>
      <div className="flex h-[112px] items-end gap-1.5">
        {rows.map((row) => {
          const h = row.count ? Math.max(8, (row.count / max) * 100) : 3;
          return (
            <div key={row.name} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="tabular-nums text-[10px] text-ink-faint">{row.count || ""}</span>
              <div
                className="w-full rounded-t-[6px]"
                style={{
                  height: `${h}%`,
                  background: row.count ? ACCENT : LINE,
                  opacity: row.count ? 0.85 : 1,
                }}
              />
              <span className="w-full truncate text-center text-[10px] text-ink-faint">{row.name.replace("周", "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DeltaBars({ rows }: { rows: { name: string; delta: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.delta)));
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const width = (Math.abs(row.delta) / max) * 48;
        const up = row.delta > 0;
        return (
          <li key={row.name} className="grid grid-cols-[4.5rem_1fr_3.2rem] items-center gap-2 text-[13px]">
            <span className="truncate text-ink">{row.name}</span>
            <div className="relative h-[10px]">
              <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
              <div
                className="absolute top-0 h-full rounded-full"
                style={{
                  width: `${Math.max(row.delta === 0 ? 0 : 8, width)}%`,
                  left: up ? "50%" : `calc(50% - ${Math.max(row.delta === 0 ? 0 : 8, width)}%)`,
                  background: up ? INK : ACCENT,
                }}
              />
            </div>
            <span className="tabular-nums text-right text-ink-soft">
              {row.delta === 0 ? "持平" : `${up ? "+" : "−"}${Math.abs(row.delta)}%`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const width = 320;
  const height = 156;
  const padL = 22;
  const padR = 8;
  const padT = 12;
  const padB = 22;
  const usable = points.filter((p) => p.score != null);
  const xs = points.map((_, i) => padL + (i / Math.max(1, points.length - 1)) * (width - padL - padR));
  const y = (score: number) => padT + ((10 - score) / 9) * (height - padT - padB);
  const parts: string[] = [];
  let drawing = false;
  points.forEach((p, i) => {
    if (p.score == null) {
      drawing = false;
      return;
    }
    parts.push(`${drawing ? "L" : "M"}${xs[i]} ${y(p.score)}`);
    drawing = true;
  });
  const line = parts.join(" ");
  let firstI = -1;
  let lastI = -1;
  points.forEach((p, i) => {
    if (p.score == null) return;
    if (firstI < 0) firstI = i;
    lastI = i;
  });
  const area =
    firstI >= 0 && lastI > firstI
      ? `${line} L ${xs[lastI]} ${height - padB} L ${xs[firstI]} ${height - padB} Z`
      : "";
  const labels = points.filter((p) => p.label);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[168px] w-full" role="img" aria-label="情绪状态走势">
      {[10, 6, 2].map((n) => (
        <g key={n}>
          <line x1={padL} x2={width - padR} y1={y(n)} y2={y(n)} stroke={LINE} strokeWidth="1" />
          <text x="0" y={y(n) + 3} fill={FAINT} fontSize="9">
            {n}
          </text>
        </g>
      ))}
      {area ? <path d={area} fill={ACCENT} opacity="0.12" /> : null}
      {line ? (
        <path d={line} fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      {usable.map((p) => {
        const i = points.indexOf(p);
        return <circle key={p.day} cx={xs[i]} cy={y(p.score as number)} r="3" fill={PAPER} stroke={INK} strokeWidth="1.6" />;
      })}
      {labels.map((p) => {
        const i = points.indexOf(p);
        return (
          <text key={p.day} x={xs[i]} y={height - 4} textAnchor="middle" fill={FAINT} fontSize="9">
            {p.label}
          </text>
        );
      })}
      {!usable.length ? (
        <text x={width / 2} y={height / 2} textAnchor="middle" fill={SOFT} fontSize="12">
          日子还太短，看不出走势
        </text>
      ) : null}
    </svg>
  );
}
