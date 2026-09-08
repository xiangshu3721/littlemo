export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDay(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today() {
  return toDay(new Date());
}

export function formatClock(ts: number) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDayLabel(day: string, now = new Date()) {
  const todayStr = toDay(now);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const [yy, mm, dd] = day.split("-");
  const datePart = `${Number(yy) === now.getFullYear() ? "" : `${yy}年`}${Number(mm)}月${Number(dd)}日`;
  const weekday = weekdayName(day);
  if (day === todayStr) return `今天 ${datePart} ${weekday}`;
  if (day === toDay(y)) return `昨天 ${datePart} ${weekday}`;
  return `${datePart} ${weekday}`;
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekId(date = new Date()) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    id: `week-${toDay(start)}`,
    label: `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`,
    startDay: toDay(start),
    endDay: toDay(end),
  };
}

export function monthId(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    id: `month-${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
    label: `${start.getFullYear()}年${start.getMonth() + 1}月`,
    startDay: toDay(start),
    endDay: toDay(end),
  };
}

export function rollingDays(n: number, from = new Date()) {
  const end = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const start = new Date(end);
  start.setDate(end.getDate() - (n - 1));
  return {
    id: `days${n}-${toDay(end)}`,
    label: `近${n}天`,
    startDay: toDay(start),
    endDay: toDay(end),
  };
}

export function periodBox(kind: "week" | "month" | "days90", cursor = new Date()) {
  if (kind === "week") return weekId(cursor);
  if (kind === "month") return monthId(cursor);
  return rollingDays(90, cursor);
}

export function previousBox(kind: "week" | "month" | "days90", startDay: string, endDay: string) {
  const start = new Date(`${startDay}T12:00:00`);
  const end = new Date(`${endDay}T12:00:00`);
  const span = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (kind === "month") {
    const prev = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    return monthId(prev);
  }
  const prevEnd = new Date(start);
  prevEnd.setDate(start.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - (span - 1));
  return {
    id: `prev-${toDay(prevStart)}`,
    label: `${prevStart.getMonth() + 1}月${prevStart.getDate()}日 - ${prevEnd.getMonth() + 1}月${prevEnd.getDate()}日`,
    startDay: toDay(prevStart),
    endDay: toDay(prevEnd),
  };
}

export function weekdayName(day: string) {
  const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return names[new Date(`${day}T12:00:00`).getDay()];
}

export function eachDay(startDay: string, endDay: string) {
  const days: string[] = [];
  const cursor = new Date(`${startDay}T12:00:00`);
  const end = new Date(`${endDay}T12:00:00`);
  while (cursor <= end) {
    days.push(toDay(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function inRange(day: string, start: string, end: string) {
  return day >= start && day <= end;
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
