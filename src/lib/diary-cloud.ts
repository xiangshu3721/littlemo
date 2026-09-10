import { prisma, type ChatMessage, type DiarySession, type PeriodReport, type Prisma } from "@littlemo/db";
import { asPeriodKind } from "@/lib/api-guard";
import { toDay } from "@/lib/dates";
import { LIMITS, clipStringList, clipText } from "@/lib/limits";
import type { Analysis, AnalysisStatus, EpisodeStatus, MoodId, PatternSummary, PatternSummaryStatus, PeriodKind } from "@/lib/types";

const MOODS: MoodId[] = ["happy", "calm", "sad", "angry", "anxious", "tired"];
const ANALYSIS_STATUS: AnalysisStatus[] = ["idle", "pending", "done", "error"];
const EPISODE_STATUS: EpisodeStatus[] = ["active", "pending", "paused", "completed", "reopened"];
const PATTERN_SUMMARY_STATUS: PatternSummaryStatus[] = ["idle", "pending", "done", "error"];

export type DiarySessionInput = {
  id?: unknown;
  day?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  title?: unknown;
  mood?: unknown;
  analysis?: unknown;
  analysisStatus?: unknown;
  analysisError?: unknown;
  deletedAt?: unknown;
  status?: unknown;
  weather?: unknown;
  stress?: unknown;
  energy?: unknown;
  primaryEmotions?: unknown;
  thoughts?: unknown;
  coreNeeds?: unknown;
  coreTheme?: unknown;
  lastUserAt?: unknown;
  patternSummary?: unknown;
  patternSummaryStatus?: unknown;
  patternSummaryError?: unknown;
  patternSummaryAt?: unknown;
};

export type DiaryMessageInput = {
  id?: unknown;
  sessionId?: unknown;
  role?: unknown;
  content?: unknown;
  text?: unknown;
  createdAt?: unknown;
  clientId?: unknown;
  model?: unknown;
};

export type DiaryReportInput = {
  id?: unknown;
  kind?: unknown;
  label?: unknown;
  generatedAt?: unknown;
  highFrequency?: unknown;
  patterns?: unknown;
  insight?: unknown;
  encouragement?: unknown;
  panorama?: unknown;
  topNote?: unknown;
  trendNote?: unknown;
  rhythms?: unknown;
  triggers?: unknown;
  loop?: unknown;
  unseen?: unknown;
  growthNote?: unknown;
  growth?: unknown;
};

export function asClientId(value: unknown) {
  const id = clipText(value, 64).trim();
  if (!/^[A-Za-z0-9._:-]{1,64}$/.test(id)) return "";
  return id;
}

function asDay(value: unknown, fallback = toDay(new Date())) {
  const day = clipText(value, 16).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : fallback;
}

function asDate(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof value === "string") {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && value.trim() !== "") {
      const d = new Date(asNum);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function asScore(value: unknown): number | null | undefined {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(10, Math.round(n)));
}

function asMood(value: unknown): MoodId | undefined {
  const mood = clipText(value, 16).trim();
  return MOODS.includes(mood as MoodId) ? (mood as MoodId) : undefined;
}

function asAnalysisStatus(value: unknown): AnalysisStatus {
  const status = clipText(value, 16).trim();
  return ANALYSIS_STATUS.includes(status as AnalysisStatus) ? (status as AnalysisStatus) : "idle";
}

function asEpisodeStatus(value: unknown): EpisodeStatus {
  const status = clipText(value, 16).trim();
  return EPISODE_STATUS.includes(status as EpisodeStatus) ? (status as EpisodeStatus) : "active";
}


function asPatternSummaryStatus(value: unknown): PatternSummaryStatus {
  const status = clipText(value, 16).trim();
  return PATTERN_SUMMARY_STATUS.includes(status as PatternSummaryStatus)
    ? (status as PatternSummaryStatus)
    : "idle";
}

function clipPatternSummary(input: unknown): PatternSummary | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const threads = clipStringList(row.threads, 4, 80);
  const headline = clipText(row.headline, 24).trim();
  const narrative = clipText(row.narrative, 800).trim();
  const takeaway = clipText(row.takeaway, 160).trim();
  if (!headline && !narrative && !takeaway && !threads.length) return null;
  const generatedAt =
    typeof row.generatedAt === "number" && Number.isFinite(row.generatedAt)
      ? row.generatedAt
      : undefined;
  return {
    headline: headline || "这一段的情绪模式",
    narrative: narrative || "这一段里我说了一些心里的事。先收下，不必立刻定论。",
    threads: threads.length
      ? threads
      : ["我好像在同一类感受里绕了一圈"],
    takeaway: takeaway || "先看见这一段就好，不急着修好自己。",
    generatedAt,
  };
}

function clipAnalysis(input: unknown): Analysis | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const num = (value: unknown) => {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  };
  return {
    facts: clipText(row.facts, 800),
    emotions: clipStringList(row.emotions, 8, 16),
    needs: clipText(row.needs, 400),
    insight: clipText(row.insight, 800),
    suggestedMood: asMood(row.suggestedMood),
    thoughts: row.thoughts ? clipText(row.thoughts, 400) : undefined,
    coreTouch: row.coreTouch ? clipText(row.coreTouch, 400) : undefined,
    title: row.title ? clipText(row.title, 24) : undefined,
    reframe: row.reframe ? clipText(row.reframe, 800) : undefined,
    body: row.body ? clipText(row.body, 400) : undefined,
    felt: row.felt ? clipText(row.felt, 400) : undefined,
    originalEmotion: row.originalEmotion ? clipText(row.originalEmotion, 120) : undefined,
    pattern: row.pattern ? clipText(row.pattern, 400) : undefined,
    seen: row.seen ? clipText(row.seen, 400) : undefined,
    treatSelf: row.treatSelf ? clipText(row.treatSelf, 400) : undefined,
    weatherFrom: row.weatherFrom ? clipText(row.weatherFrom, 8) : undefined,
    weatherTo: row.weatherTo ? clipText(row.weatherTo, 8) : undefined,
    stressFrom: num(row.stressFrom),
    stressTo: num(row.stressTo),
    energyFrom: num(row.energyFrom),
    energyTo: num(row.energyTo),
  };
}

function jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function sessionJson(row: DiarySession) {
  return {
    id: row.id,
    day: row.day,
    startedAt: row.startedAt.getTime(),
    endedAt: row.endedAt ? row.endedAt.getTime() : undefined,
    title: row.title,
    mood: (row.mood as MoodId | null) || undefined,
    analysis: (row.analysis as Analysis | null) || undefined,
    analysisStatus: asAnalysisStatus(row.analysisStatus),
    analysisError: row.analysisError || undefined,
    deletedAt: row.deletedAt ? row.deletedAt.getTime() : undefined,
    status: asEpisodeStatus(row.status),
    weather: row.weather || undefined,
    stress: row.stress,
    energy: row.energy,
    primaryEmotions: Array.isArray(row.primaryEmotions) ? (row.primaryEmotions as string[]) : undefined,
    thoughts: Array.isArray(row.thoughts) ? (row.thoughts as string[]) : undefined,
    coreNeeds: Array.isArray(row.coreNeeds) ? (row.coreNeeds as string[]) : undefined,
    coreTheme: row.coreTheme || undefined,
    lastUserAt: row.lastUserAt ? row.lastUserAt.getTime() : undefined,
    patternSummary: (row.patternSummary as PatternSummary | null) || undefined,
    patternSummaryStatus: asPatternSummaryStatus(row.patternSummaryStatus),
    patternSummaryError: row.patternSummaryError || undefined,
    patternSummaryAt: row.patternSummaryAt ? row.patternSummaryAt.getTime() : undefined,
  };
}

export function messageJson(row: ChatMessage) {
  return {
    id: row.clientId || row.id,
    dbId: row.id,
    sessionId: row.sessionId || "",
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    text: row.content,
    model: row.model,
    clientId: row.clientId,
    createdAt: row.createdAt.toISOString(),
    createdAtMs: row.createdAt.getTime(),
  };
}

export function reportJson(row: PeriodReport) {
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};
  return {
    id: row.periodId,
    kind: row.kind as PeriodKind,
    label: row.label,
    generatedAt: row.generatedAt.getTime(),
    ...payload,
  };
}

export async function loadDiaryBundle(userId: string) {
  const [sessions, messages, reports] = await Promise.all([
    prisma.diarySession.findMany({
      where: { userId },
      orderBy: { startedAt: "asc" },
      take: LIMITS.diarySessions,
    }),
    prisma.chatMessage.findMany({
      where: { userId, sessionId: { not: null } },
      orderBy: { createdAt: "asc" },
      take: LIMITS.diaryMessages,
    }),
    prisma.periodReport.findMany({
      where: { userId },
      orderBy: { generatedAt: "asc" },
      take: LIMITS.diaryReports,
    }),
  ]);
  return {
    sessions: sessions.map(sessionJson),
    messages: messages.map(messageJson),
    reports: reports.map(reportJson),
  };
}

export async function ensureOwnedSession(
  userId: string,
  sessionId: string,
  patch: {
    day?: string;
    title?: string;
    lastUserAt?: Date;
    startedAt?: Date;
    status?: EpisodeStatus;
  } = {},
) {
  const id = asClientId(sessionId);
  if (!id) return null;
  const existing = await prisma.diarySession.findUnique({ where: { id } });
  if (existing && existing.userId !== userId) {
    const err = new Error("SESSION_TAKEN");
    throw err;
  }
  if (existing) {
    return prisma.diarySession.update({
      where: { id },
      data: {
        day: patch.day || existing.day,
        title: existing.title || patch.title || existing.title,
        lastUserAt: patch.lastUserAt || existing.lastUserAt,
        status: patch.status || existing.status,
      },
    });
  }
  const now = patch.startedAt || new Date();
  return prisma.diarySession.create({
    data: {
      id,
      userId,
      day: patch.day || toDay(now),
      startedAt: now,
      title: (patch.title || "还在聊的一段").slice(0, 18),
      analysisStatus: "idle",
      status: patch.status || "active",
      lastUserAt: patch.lastUserAt,
    },
  });
}

export async function saveSessionAnalysis(
  userId: string,
  sessionId: string,
  analysis: Analysis,
  extra: { title?: string; mood?: MoodId; status?: AnalysisStatus } = {},
) {
  const owned = await ensureOwnedSession(userId, sessionId);
  if (!owned) return null;
  return prisma.diarySession.update({
    where: { id: owned.id },
    data: {
      analysis: jsonValue(analysis) ?? undefined,
      analysisStatus: extra.status || "done",
      analysisError: null,
      title: extra.title || analysis.title || owned.title,
      mood: extra.mood || analysis.suggestedMood || owned.mood,
    },
  });
}


export async function savePatternSummary(
  userId: string,
  sessionId: string,
  summary: PatternSummary,
) {
  const owned = await ensureOwnedSession(userId, sessionId);
  if (!owned) return null;
  return prisma.diarySession.update({
    where: { id: owned.id },
    data: {
      patternSummary: jsonValue(summary) ?? undefined,
      patternSummaryStatus: "done",
      patternSummaryError: null,
      patternSummaryAt: new Date(summary.generatedAt || Date.now()),
    },
  });
}

export async function savePatternSummaryStatus(
  userId: string,
  sessionId: string,
  data: { patternSummaryStatus?: PatternSummaryStatus; patternSummaryError?: string | null },
) {
  const owned = await ensureOwnedSession(userId, sessionId);
  if (!owned) return null;
  return prisma.diarySession.update({
    where: { id: owned.id },
    data: {
      patternSummaryStatus: data.patternSummaryStatus || owned.patternSummaryStatus,
      patternSummaryError:
        data.patternSummaryError === undefined ? owned.patternSummaryError : data.patternSummaryError,
    },
  });
}

export async function saveSessionStatus(
  userId: string,
  sessionId: string,
  data: { analysisStatus?: AnalysisStatus; analysisError?: string | null; endedAt?: Date; status?: EpisodeStatus },
) {
  const owned = await ensureOwnedSession(userId, sessionId);
  if (!owned) return null;
  return prisma.diarySession.update({
    where: { id: owned.id },
    data: {
      analysisStatus: data.analysisStatus || owned.analysisStatus,
      analysisError: data.analysisError === undefined ? owned.analysisError : data.analysisError,
      endedAt: data.endedAt || owned.endedAt,
      status: data.status || owned.status,
    },
  });
}

function clipReportPayload(input: DiaryReportInput) {
  const rhythms =
    input.rhythms && typeof input.rhythms === "object"
      ? (input.rhythms as Record<string, unknown>)
      : {};
  const triggers = Array.isArray(input.triggers) ? input.triggers.slice(0, 8) : [];
  const unseen = Array.isArray(input.unseen) ? input.unseen.slice(0, 6) : [];
  const growth = Array.isArray(input.growth) ? input.growth.slice(0, 8) : [];
  const highFrequency = Array.isArray(input.highFrequency) ? input.highFrequency.slice(0, 8) : [];
  const loop =
    input.loop && typeof input.loop === "object" ? (input.loop as { title?: unknown; steps?: unknown }) : {};
  return {
    highFrequency: highFrequency.map((row) => {
      const item = row && typeof row === "object" ? (row as { name?: unknown; count?: unknown }) : {};
      return { name: clipText(item.name, 24), count: Number(item.count) || 0 };
    }),
    patterns: clipText(input.patterns, 800),
    insight: clipText(input.insight, 800),
    encouragement: clipText(input.encouragement, 400),
    panorama: input.panorama ? clipText(input.panorama, 800) : undefined,
    topNote: input.topNote ? clipText(input.topNote, 400) : undefined,
    trendNote: input.trendNote ? clipText(input.trendNote, 400) : undefined,
    rhythms: {
      time: rhythms.time ? clipText(rhythms.time, 200) : undefined,
      weekday: rhythms.weekday ? clipText(rhythms.weekday, 200) : undefined,
      scene: rhythms.scene ? clipText(rhythms.scene, 200) : undefined,
      people: rhythms.people ? clipText(rhythms.people, 200) : undefined,
      event: rhythms.event ? clipText(rhythms.event, 200) : undefined,
    },
    triggers: triggers.map((row) => {
      const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return {
        name: clipText(item.name, 24),
        count: Number(item.count) || 0,
        chain: item.chain ? clipText(item.chain, 200) : undefined,
        scenes: item.scenes ? clipText(item.scenes, 200) : undefined,
        behaviors: item.behaviors ? clipText(item.behaviors, 200) : undefined,
      };
    }),
    loop: {
      title: loop.title ? clipText(loop.title, 40) : undefined,
      steps: clipStringList(loop.steps, 8, 120),
    },
    unseen: unseen.map((row) => {
      const item = row && typeof row === "object" ? (row as { title?: unknown; body?: unknown }) : {};
      return { title: clipText(item.title, 40), body: clipText(item.body, 400) };
    }),
    growthNote: input.growthNote ? clipText(input.growthNote, 400) : undefined,
    growth: growth.map((row) => {
      const item = row && typeof row === "object" ? (row as { name?: unknown; delta?: unknown }) : {};
      return { name: clipText(item.name, 24), delta: Number(item.delta) || 0 };
    }),
  };
}

export async function upsertDiarySession(userId: string, input: DiarySessionInput) {
  const id = asClientId(input.id);
  if (!id) return { ok: false as const, error: "缺少段落。" };
  const existing = await prisma.diarySession.findUnique({ where: { id } });
  if (existing && existing.userId !== userId) return { ok: false as const, error: "段落冲突。" };
  const startedAt = asDate(input.startedAt) || existing?.startedAt || new Date();
  const data = {
    day: asDay(input.day, toDay(startedAt)),
    startedAt,
    endedAt: asDate(input.endedAt) || null,
    title: clipText(input.title, 18).trim() || existing?.title || "还在聊的一段",
    mood: asMood(input.mood) || null,
    analysis: jsonValue(clipAnalysis(input.analysis)) ?? undefined,
    analysisStatus: asAnalysisStatus(input.analysisStatus),
    analysisError: clipText(input.analysisError, 80).trim() || null,
    deletedAt: asDate(input.deletedAt) || null,
    status: asEpisodeStatus(input.status),
    weather: clipText(input.weather, 8).trim() || null,
    stress: asScore(input.stress) ?? null,
    energy: asScore(input.energy) ?? null,
    primaryEmotions: jsonValue(clipStringList(input.primaryEmotions, 8, 16)),
    thoughts: jsonValue(clipStringList(input.thoughts, 8, 80)),
    coreNeeds: jsonValue(clipStringList(input.coreNeeds, 8, 40)),
    coreTheme: clipText(input.coreTheme, 120).trim() || null,
    lastUserAt: asDate(input.lastUserAt) || null,
    patternSummary: jsonValue(clipPatternSummary(input.patternSummary)) ?? undefined,
    patternSummaryStatus: asPatternSummaryStatus(input.patternSummaryStatus),
    patternSummaryError: clipText(input.patternSummaryError, 80).trim() || null,
    patternSummaryAt: asDate(input.patternSummaryAt) || null,
  };
  const row = existing
    ? await prisma.diarySession.update({
        where: { id },
        data,
      })
    : await prisma.diarySession.create({
        data: { id, userId, ...data, analysis: data.analysis ?? undefined },
      });
  return { ok: true as const, row };
}

export async function upsertDiaryMessage(userId: string, input: DiaryMessageInput) {
  const sessionId = asClientId(input.sessionId);
  if (!sessionId) return { ok: false as const, error: "缺少段落。" };
  const session = await prisma.diarySession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return { ok: false as const, error: "找不到这段。" };
  const role = clipText(input.role, 16) === "assistant" ? "assistant" : "user";
  const content = clipText(input.content ?? input.text, LIMITS.latestChars).trim();
  if (!content) return { ok: false as const, error: "先写一点。" };
  const createdAt = asDate(input.createdAt) || new Date();
  const requestedId = asClientId(input.id);
  const clientId = asClientId(input.clientId) || (requestedId && !requestedId.startsWith("chat-") ? requestedId : "");

  if (requestedId) {
    const byId = await prisma.chatMessage.findUnique({ where: { id: requestedId } });
    if (byId) {
      if (byId.userId !== userId) return { ok: false as const, error: "记录冲突。" };
      const row = await prisma.chatMessage.update({
        where: { id: byId.id },
        data: { sessionId, role, content, clientId: clientId || byId.clientId },
      });
      return { ok: true as const, row };
    }
  }

  if (clientId) {
    const byClient = await prisma.chatMessage.findUnique({
      where: { userId_clientId: { userId, clientId } },
    });
    if (byClient) {
      const row = await prisma.chatMessage.update({
        where: { id: byClient.id },
        data: { sessionId, role, content },
      });
      return { ok: true as const, row };
    }
  }

  const nearby = await prisma.chatMessage.findFirst({
    where: {
      userId,
      role,
      content,
      createdAt: {
        gte: new Date(createdAt.getTime() - 10_000),
        lte: new Date(createdAt.getTime() + 10_000),
      },
      OR: [{ sessionId: null }, { sessionId }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (nearby) {
    const row = await prisma.chatMessage.update({
      where: { id: nearby.id },
      data: { sessionId, clientId: clientId || nearby.clientId },
    });
    return { ok: true as const, row };
  }

  try {
    const row = await prisma.chatMessage.create({
      data: {
        ...(requestedId ? { id: requestedId } : {}),
        userId,
        role,
        content,
        sessionId,
        clientId: clientId || null,
        createdAt,
        model: clipText(input.model, 64).trim() || null,
      },
    });
    return { ok: true as const, row };
  } catch {
    return { ok: false as const, error: "没记下。" };
  }
}

export async function upsertDiaryReport(userId: string, input: DiaryReportInput) {
  const periodId = asClientId(input.id);
  const kind = asPeriodKind(input.kind);
  if (!periodId) return { ok: false as const, error: "缺少阶段。" };
  if (!kind) return { ok: false as const, error: "范围不对" };
  const generatedAt = asDate(input.generatedAt) || new Date();
  const payload = clipReportPayload(input) as Prisma.InputJsonValue;
  const row = await prisma.periodReport.upsert({
    where: { userId_periodId: { userId, periodId } },
    create: {
      userId,
      periodId,
      kind,
      label: clipText(input.label, 48) || kind,
      generatedAt,
      payload,
    },
    update: {
      kind,
      label: clipText(input.label, 48) || kind,
      generatedAt,
      payload,
    },
  });
  return { ok: true as const, row };
}

export async function savePeriodReport(
  userId: string,
  input: {
    periodId: string;
    kind: PeriodKind;
    label: string;
    generatedAt?: Date;
    report: Record<string, unknown>;
  },
) {
  return upsertDiaryReport(userId, {
    id: input.periodId,
    kind: input.kind,
    label: input.label,
    generatedAt: input.generatedAt?.getTime() || Date.now(),
    ...input.report,
  });
}
