import Taro from "@tarojs/taro";
import { api } from "./api";
import { formatClock, toDay, today } from "./diary-dates";
import { clipText, DIARY_LIMITS, isArchiveMark, wantsCloseEpisode } from "./diary-moods";
import type {
  Analysis,
  DiaryBundle,
  Message,
  PeriodKind,
  PeriodPayloadEntry,
  PeriodReport,
  Session,
} from "./diary-types";
import { getUser } from "./session";

const EMPTY: DiaryBundle = { sessions: [], messages: [], reports: [] };

function storageKey(userId: string) {
  return `littlemo.diary.${userId}`;
}

function nid() {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function currentUserId() {
  return getUser()?.id || "anon";
}

let cache: DiaryBundle = EMPTY;
let cacheUser = "";
let write: Promise<void> = Promise.resolve();

function cloneBundle(bundle: DiaryBundle): DiaryBundle {
  return {
    sessions: bundle.sessions.map((s) => ({ ...s })),
    messages: bundle.messages.map((m) => ({ ...m })),
    reports: bundle.reports.map((r) => ({ ...r })),
  };
}

function readRaw(userId: string): DiaryBundle {
  try {
    const raw = Taro.getStorageSync(storageKey(userId)) as DiaryBundle | string;
    if (!raw) return cloneBundle(EMPTY);
    const data = typeof raw === "string" ? (JSON.parse(raw) as DiaryBundle) : raw;
    return {
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      messages: Array.isArray(data.messages) ? data.messages : [],
      reports: Array.isArray(data.reports) ? data.reports : [],
    };
  } catch {
    return cloneBundle(EMPTY);
  }
}

function writeRaw(userId: string, bundle: DiaryBundle) {
  Taro.setStorageSync(storageKey(userId), bundle);
  cache = cloneBundle(bundle);
  cacheUser = userId;
}

export function loadDiary(userId = currentUserId()): DiaryBundle {
  if (cacheUser === userId) return cloneBundle(cache);
  const next = readRaw(userId);
  cache = cloneBundle(next);
  cacheUser = userId;
  return next;
}

function persist(mutator: (bundle: DiaryBundle) => void, userId = currentUserId()) {
  write = write.then(() => {
    const bundle = loadDiary(userId);
    mutator(bundle);
    writeRaw(userId, bundle);
  });
  return write;
}

export function liveSessions(bundle = loadDiary()) {
  return bundle.sessions.filter((s) => !s.deletedAt).sort((a, b) => a.startedAt - b.startedAt);
}

export function liveMessages(bundle = loadDiary()) {
  const ids = new Set(liveSessions(bundle).map((s) => s.id));
  return bundle.messages.filter((m) => ids.has(m.sessionId)).sort((a, b) => a.createdAt - b.createdAt);
}

export async function persistSession(session: Session) {
  await persist((bundle) => {
    const i = bundle.sessions.findIndex((s) => s.id === session.id);
    if (i >= 0) bundle.sessions[i] = session;
    else bundle.sessions.push(session);
  });
}

export async function persistMessage(message: Message) {
  await persist((bundle) => {
    const i = bundle.messages.findIndex((m) => m.id === message.id);
    if (i >= 0) bundle.messages[i] = message;
    else bundle.messages.push(message);
  });
}

export async function trashSession(sessionId: string) {
  const bundle = loadDiary();
  const cur = bundle.sessions.find((s) => s.id === sessionId);
  if (!cur) return;
  await persistSession({ ...cur, deletedAt: Date.now(), endedAt: cur.endedAt || Date.now() });
}

function isUserTurn(message: Message) {
  return message.role === "user" && Boolean(message.text.trim() || message.image);
}

function userLines(sessionId: string, bundle = loadDiary()) {
  return bundle.messages
    .filter((m) => m.sessionId === sessionId && isUserTurn(m))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function openTalkSession(bundle = loadDiary()) {
  return liveSessions(bundle)
    .filter((s) => !s.endedAt && userLines(s.id, bundle).some((m) => !wantsCloseEpisode(m.text)))
    .sort((a, b) => (b.lastUserAt || b.startedAt) - (a.lastUserAt || a.startedAt))[0];
}

export async function ensureOpenSession(title: string, at = Date.now()) {
  const bundle = loadDiary();
  const lastOf = (id: string) =>
    [...bundle.messages].filter((m) => m.sessionId === id).sort((a, b) => a.createdAt - b.createdAt).at(-1);
  let open: Session | undefined = liveSessions(bundle)
    .filter((s) => !s.endedAt)
    .sort((a, b) => (b.lastUserAt || b.startedAt) - (a.lastUserAt || a.startedAt))[0];
  const lastOpen = open ? lastOf(open.id) : undefined;
  if (
    open &&
    lastOpen &&
    ((lastOpen.role === "assistant" && isArchiveMark(lastOpen.text)) ||
      (lastOpen.role === "user" && wantsCloseEpisode(lastOpen.text)))
  ) {
    await closeSession(open, "completed");
    open = undefined;
  }
  if (!open || open.endedAt) {
    open = {
      id: nid(),
      day: toDay(new Date(at)),
      startedAt: at,
      title: title.trim().slice(0, 18) || "还在聊的一段",
      analysisStatus: "idle",
      status: "active",
    };
    await persistSession(open);
    return open;
  }
  if (!open.title && title.trim()) {
    open = { ...open, title: title.trim().slice(0, 18), day: today() };
    await persistSession(open);
  }
  return open;
}

export async function appendTurn(input: {
  text: string;
  image?: string;
  reply?: string;
  createdAt?: number;
  replyAt?: number;
}) {
  const at = input.createdAt || Date.now();
  const day = toDay(new Date(at));
  const closeText = input.text.trim();
  const title = closeText || (input.image ? "（图片）" : "");
  const open = await ensureOpenSession(title, at);
  const userMsg: Message = {
    id: nid(),
    sessionId: open.id,
    role: "user",
    createdAt: at,
    day,
    text: clipText(closeText, DIARY_LIMITS.latestChars).trim(),
    image: input.image,
  };
  await persistMessage(userMsg);
  await persistSession({ ...open, lastUserAt: at, day, title: open.title || title.slice(0, 18) });
  if (input.reply) {
    await persistMessage({
      id: nid(),
      sessionId: open.id,
      role: "assistant",
      createdAt: input.replyAt || Date.now(),
      day: toDay(new Date(input.replyAt || Date.now())),
      text: input.reply,
    });
  }
  if (wantsCloseEpisode(closeText)) {
    const latest = loadDiary().sessions.find((s) => s.id === open.id);
    if (latest && !latest.endedAt) await closeSession(latest, "completed");
  }
  return loadDiary();
}

export async function analyzeSession(sessionId: string) {
  const bundle = loadDiary();
  const session = bundle.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const lines = bundle.messages
    .filter((m) => m.sessionId === sessionId && !m.pending && (m.text.trim() || m.image))
    .map((m) => ({
      role: m.role,
      text: clipText(m.text || (m.image ? "（图片）" : ""), DIARY_LIMITS.lineChars),
      time: formatClock(m.createdAt),
    }))
    .slice(-DIARY_LIMITS.analyzeLines);
  if (!lines.some((l) => l.role === "user")) return;
  await persistSession({ ...session, analysisStatus: "pending", analysisError: undefined });
  try {
    const data = await api<{ analysis?: Analysis; error?: string }>("/api/analyze", {
      method: "POST",
      data: { lines },
      timeout: 90_000,
    });
    const latest = loadDiary().sessions.find((s) => s.id === sessionId);
    if (!latest) return;
    await persistSession({
      ...latest,
      analysis: data.analysis,
      analysisStatus: "done",
      title: data.analysis?.title || latest.title,
      mood: latest.mood || data.analysis?.suggestedMood,
      analysisError: undefined,
    });
  } catch (err) {
    const latest = loadDiary().sessions.find((s) => s.id === sessionId);
    if (!latest) return;
    await persistSession({
      ...latest,
      analysisStatus: "error",
      analysisError: err instanceof Error ? err.message : "分析失败",
    });
  }
}

export async function closeSession(session: Session, status: Session["status"] = "paused") {
  const latest = loadDiary().sessions.find((s) => s.id === session.id) || session;
  if (latest.deletedAt) return;
  const closed: Session = {
    ...latest,
    endedAt: latest.endedAt || Date.now(),
    status,
    analysisStatus: latest.analysisStatus === "done" ? "done" : "pending",
    day: userLines(latest.id).at(-1)?.day || latest.day,
  };
  await persistSession(closed);
  void analyzeSession(latest.id);
}

export async function requestInsight() {
  const talk = openTalkSession();
  if (!talk) return;
  await closeSession(talk, "completed");
}

export async function retryAnalysis(sessionId: string) {
  await analyzeSession(sessionId);
}

export function loadReport(id: string) {
  return loadDiary().reports.find((r) => r.id === id);
}

export async function saveReport(report: PeriodReport) {
  await persist((bundle) => {
    const i = bundle.reports.findIndex((r) => r.id === report.id);
    if (i >= 0) bundle.reports[i] = report;
    else bundle.reports.push(report);
  });
}

export async function requestPeriodReport(input: {
  kind: PeriodKind;
  label: string;
  periodId: string;
  digest: string;
  entries: PeriodPayloadEntry[];
  force?: boolean;
  latestEnd?: number;
}) {
  if (!input.force) {
    const cached = loadReport(input.periodId);
    if (cached) {
      const rich = Boolean(cached.unseen?.length || cached.panorama || cached.loop);
      if (rich && cached.generatedAt >= (input.latestEnd || 0)) return cached;
    }
  }
  const data = await api<{
    report?: Omit<PeriodReport, "id" | "kind" | "label" | "generatedAt">;
    error?: string;
  }>("/api/period", {
    method: "POST",
    data: {
      kind: input.kind,
      label: input.label,
      digest: clipText(input.digest, DIARY_LIMITS.digestChars),
      entries: input.entries.slice(-DIARY_LIMITS.periodEntries),
    },
    timeout: 90_000,
  });
  const next: PeriodReport = {
    id: input.periodId,
    kind: input.kind,
    label: input.label,
    generatedAt: Date.now(),
    ...data.report!,
  };
  await saveReport(next);
  return next;
}

type CloudNote = { id: string; content: string; createdAt: string };
type CloudMessage = { id: string; role: string; content: string; createdAt: string };

let hydrating: Promise<DiaryBundle> | null = null;

export async function hydrateFromCloud(notes: CloudNote[], messages: CloudMessage[]) {
  const existing = loadDiary();
  if (existing.messages.length || existing.sessions.length) return existing;
  if (hydrating) return hydrating;
  hydrating = (async () => {
    const bundle = loadDiary();
    if (bundle.messages.length || bundle.sessions.length) return bundle;
    const userFromNotes = notes.map((note) => ({
      id: `note-${note.id}`,
      role: "user" as const,
      content: note.content,
      createdAt: note.createdAt,
    }));
    const fromChat = messages
      .filter((row) => row.role === "assistant" || row.role === "user")
      .map((row) => ({
        id: `chat-${row.id}`,
        role: (row.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: row.content,
        createdAt: row.createdAt,
      }));
    const timeline =
      fromChat.length > 0
        ? fromChat.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        : userFromNotes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (!timeline.length) return bundle;
    const first = new Date(timeline[0].createdAt).getTime() || Date.now();
    const last = new Date(timeline.at(-1)!.createdAt).getTime() || first;
    const session: Session = {
      id: nid(),
      day: toDay(new Date(first)),
      startedAt: first,
      title: (timeline.find((m) => m.role === "user")?.content || "还在聊的一段").replace(/\s+/g, " ").slice(0, 18),
      analysisStatus: "idle",
      status: "active",
      lastUserAt: last,
    };
    await persistSession(session);
    for (const row of timeline) {
      const at = new Date(row.createdAt).getTime() || Date.now();
      await persistMessage({
        id: row.id,
        sessionId: session.id,
        role: row.role,
        createdAt: at,
        day: toDay(new Date(at)),
        text: row.content || "",
      });
    }
    return loadDiary();
  })().finally(() => {
    hydrating = null;
  });
  return hydrating;
}

export async function resumePendingAnalysis() {
  const bundle = loadDiary();
  for (const row of bundle.sessions) {
    if (row.endedAt && !row.deletedAt && row.analysisStatus === "pending") {
      void analyzeSession(row.id);
    }
  }
}
