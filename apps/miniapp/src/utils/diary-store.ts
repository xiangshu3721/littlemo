import Taro from "@tarojs/taro";
import { api, ApiError } from "./api";
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
import { getToken, getUser } from "./session";

const EMPTY: DiaryBundle = { sessions: [], messages: [], reports: [] };

function storageKey(userId: string) {
  return `littlemo.diary.${userId}`;
}

function nid() {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function newDiaryId() {
  return nid();
}

function currentUserId() {
  return getUser()?.id || "anon";
}

let cache: DiaryBundle = EMPTY;
let cacheUser = "";
let write: Promise<void> = Promise.resolve();

export function clearDiaryCache() {
  cache = cloneBundle(EMPTY);
  cacheUser = "";
}

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

function toCloudSession(session: Session) {
  return {
    id: session.id,
    day: session.day,
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
    title: session.title,
    mood: session.mood ?? null,
    analysis: session.analysis ?? null,
    analysisStatus: session.analysisStatus,
    analysisError: session.analysisError ?? null,
    deletedAt: session.deletedAt ?? null,
    status: session.status ?? "active",
    weather: session.weather ?? null,
    stress: session.stress ?? null,
    energy: session.energy ?? null,
    primaryEmotions: session.primaryEmotions ?? [],
    thoughts: session.thoughts ?? [],
    coreNeeds: session.coreNeeds ?? [],
    coreTheme: session.coreTheme ?? null,
    lastUserAt: session.lastUserAt ?? null,
  };
}

function toCloudMessage(message: Message) {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.text,
    createdAt: message.createdAt,
    clientId: message.id,
  };
}

function toCloudReport(report: PeriodReport) {
  return { ...report };
}

type CloudSession = Session & { startedAt: number };
type CloudMessage = {
  id: string;
  sessionId?: string;
  role: string;
  content?: string;
  text?: string;
  createdAt: string | number;
  createdAtMs?: number;
};
type CloudReport = PeriodReport;
type CloudBundle = {
  sessions?: CloudSession[];
  messages?: CloudMessage[];
  reports?: CloudReport[];
};

function fromCloudMessage(row: CloudMessage): Message {
  const at =
    row.createdAtMs ||
    (typeof row.createdAt === "number" ? row.createdAt : new Date(row.createdAt).getTime()) ||
    Date.now();
  return {
    id: row.id,
    sessionId: row.sessionId || "",
    role: row.role === "assistant" ? "assistant" : "user",
    createdAt: at,
    day: toDay(new Date(at)),
    text: (row.text || row.content || "").trim(),
  };
}

function fromCloudSession(row: CloudSession): Session {
  return {
    ...row,
    startedAt: Number(row.startedAt) || Date.now(),
    endedAt: row.endedAt ? Number(row.endedAt) : undefined,
    deletedAt: row.deletedAt ? Number(row.deletedAt) : undefined,
    lastUserAt: row.lastUserAt ? Number(row.lastUserAt) : undefined,
    analysisStatus: row.analysisStatus || "idle",
    title: row.title || "还在聊的一段",
  };
}

function bundleFromCloud(data: CloudBundle): DiaryBundle {
  return {
    sessions: (data.sessions || []).map(fromCloudSession),
    messages: (data.messages || []).map(fromCloudMessage),
    reports: Array.isArray(data.reports) ? data.reports : [],
  };
}

function sessionNeedsUpload(local: Session, cloud?: Session) {
  if (!cloud) return true;
  if ((local.deletedAt || 0) > (cloud.deletedAt || 0)) return true;
  if ((local.endedAt || 0) > (cloud.endedAt || 0)) return true;
  if (local.analysisStatus === "done" && cloud.analysisStatus !== "done") return true;
  if ((local.lastUserAt || 0) > (cloud.lastUserAt || 0)) return true;
  if (local.analysis && !cloud.analysis) return true;
  return false;
}

function canUseCloud() {
  return Boolean(getToken()) && currentUserId() !== "anon";
}

async function syncCloud(payload: { sessions?: Session[]; messages?: Message[]; reports?: PeriodReport[] }) {
  if (!canUseCloud()) return;
  const data: {
    sessions?: ReturnType<typeof toCloudSession>[];
    messages?: ReturnType<typeof toCloudMessage>[];
    reports?: PeriodReport[];
  } = {};
  if (payload.sessions?.length) data.sessions = payload.sessions.map(toCloudSession);
  if (payload.messages?.length) data.messages = payload.messages.map(toCloudMessage);
  if (payload.reports?.length) data.reports = payload.reports.map(toCloudReport);
  if (!data.sessions && !data.messages && !data.reports) return;
  await api<CloudBundle>("/api/diary", { method: "POST", data, timeout: 30_000 });
}

async function pushCloud(payload: { sessions?: Session[]; messages?: Message[]; reports?: PeriodReport[] }) {
  try {
    await syncCloud(payload);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw err;
  }
}

export async function persistSession(session: Session) {
  await persist((bundle) => {
    const i = bundle.sessions.findIndex((s) => s.id === session.id);
    if (i >= 0) bundle.sessions[i] = session;
    else bundle.sessions.push(session);
  });
  await pushCloud({ sessions: [session] });
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
  sessionId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
}) {
  const at = input.createdAt || Date.now();
  const day = toDay(new Date(at));
  const closeText = input.text.trim();
  const title = closeText || (input.image ? "（图片）" : "");
  const open = input.sessionId
    ? loadDiary().sessions.find((s) => s.id === input.sessionId) || (await ensureOpenSession(title, at))
    : await ensureOpenSession(title, at);
  const session = open.id === input.sessionId || !input.sessionId ? open : { ...open, id: input.sessionId };
  const userMsg: Message = {
    id: input.userMessageId || nid(),
    sessionId: session.id,
    role: "user",
    createdAt: at,
    day,
    text: clipText(closeText, DIARY_LIMITS.latestChars).trim(),
    image: input.image,
  };
  await persistMessage(userMsg);
  await persistSession({ ...session, lastUserAt: at, day, title: session.title || title.slice(0, 18) });
  if (input.reply) {
    await persistMessage({
      id: input.assistantMessageId || nid(),
      sessionId: session.id,
      role: "assistant",
      createdAt: input.replyAt || Date.now(),
      day: toDay(new Date(input.replyAt || Date.now())),
      text: input.reply,
    });
  }
  if (wantsCloseEpisode(closeText)) {
    const latest = loadDiary().sessions.find((s) => s.id === session.id);
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
      data: { lines, sessionId },
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
  await pushCloud({ reports: [report] });
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
      periodId: input.periodId,
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
type CloudChatRow = { id: string; role: string; content: string; createdAt: string; sessionId?: string | null };

let hydrating: Promise<DiaryBundle> | null = null;

function recoverFromChat(messages: CloudChatRow[]): DiaryBundle {
  const timeline = messages
    .filter((row) => row.role === "assistant" || row.role === "user")
    .map((row) => ({
      id: row.id,
      role: (row.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: row.content,
      createdAt: row.createdAt,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!timeline.length) return cloneBundle(EMPTY);
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
  const rows: Message[] = timeline.map((row) => {
    const at = new Date(row.createdAt).getTime() || Date.now();
    return {
      id: row.id,
      sessionId: session.id,
      role: row.role,
      createdAt: at,
      day: toDay(new Date(at)),
      text: row.content || "",
    };
  });
  return { sessions: [session], messages: rows, reports: [] };
}

function recoverFromNotes(notes: CloudNote[]): DiaryBundle {
  if (!notes.length) return cloneBundle(EMPTY);
  return recoverFromChat(
    notes.map((note) => ({
      id: `note-${note.id}`,
      role: "user",
      content: note.content,
      createdAt: note.createdAt,
    })),
  );
}

export async function hydrateFromCloud(notes: CloudNote[] = [], messages: CloudChatRow[] = []) {
  if (hydrating) return hydrating;
  hydrating = (async () => {
    const local = loadDiary();
    if (!canUseCloud()) {
      if (!local.sessions.length && (notes.length || messages.length)) {
        const recovered = messages.length ? recoverFromChat(messages) : recoverFromNotes(notes);
        if (recovered.sessions.length) writeRaw(currentUserId(), recovered);
        return loadDiary();
      }
      return local;
    }

    let cloud: DiaryBundle;
    try {
      cloud = bundleFromCloud(await api<CloudBundle>("/api/diary"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) throw err;
      return local;
    }

    const cloudSessions = new Map(cloud.sessions.map((s) => [s.id, s]));
    const uploadSessions = local.sessions.filter((s) => sessionNeedsUpload(s, cloudSessions.get(s.id)));
    const cloudReports = new Map(cloud.reports.map((r) => [r.id, r]));
    const uploadReports = local.reports.filter((r) => {
      const existing = cloudReports.get(r.id);
      return !existing || r.generatedAt > existing.generatedAt;
    });
    const cloudMessageIds = new Set(cloud.messages.map((m) => m.id));
    const uploadSessionIds = new Set(uploadSessions.map((s) => s.id));
    const uploadMessages = local.messages.filter(
      (m) => uploadSessionIds.has(m.sessionId) || !cloudMessageIds.has(m.id),
    );

    if (uploadSessions.length || uploadReports.length || (uploadMessages.length && uploadSessions.length)) {
      try {
        await syncCloud({
          sessions: uploadSessions,
          messages: uploadSessions.length ? uploadMessages : [],
          reports: uploadReports,
        });
        cloud = bundleFromCloud(await api<CloudBundle>("/api/diary"));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw err;
      }
    }

    if (!cloud.sessions.length) {
      const recovered = messages.length
        ? recoverFromChat(messages)
        : notes.length
          ? recoverFromNotes(notes)
          : cloneBundle(EMPTY);
      if (!recovered.sessions.length) {
        try {
          const chatRes = await api<{ messages: CloudChatRow[] }>("/api/chat");
          Object.assign(recovered, recoverFromChat(chatRes.messages || []));
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) throw err;
        }
      }
      if (recovered.sessions.length) {
        try {
          await syncCloud(recovered);
          cloud = bundleFromCloud(await api<CloudBundle>("/api/diary"));
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) throw err;
          writeRaw(currentUserId(), recovered);
          return loadDiary();
        }
      }
    }

    writeRaw(currentUserId(), cloud);
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
