import { publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import {
  loadDiaryBundle,
  upsertDiaryMessage,
  upsertDiaryReport,
  upsertDiarySession,
  type DiaryMessageInput,
  type DiaryReportInput,
  type DiarySessionInput,
} from "@/lib/diary-cloud";
import { LIMITS } from "@/lib/limits";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request) {
  const limited = rateLimit(req, LIMITS.rateDiaryPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const bundle = await loadDiaryBundle(auth.user.id);
    return apiJson(req, bundle);
  } catch (err) {
    return apiJson(req, { error: publicError(err, "日记读不出来") }, 500);
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateDiaryPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const parsed = await readJsonBody<{
      sessions?: DiarySessionInput[];
      messages?: DiaryMessageInput[];
      reports?: DiaryReportInput[];
    }>(req, LIMITS.jsonBodyDiary);
    if (!parsed.ok) return withCors(req, parsed.response);

    const sessions = Array.isArray(parsed.data.sessions)
      ? parsed.data.sessions.slice(0, LIMITS.diarySessions)
      : [];
    const messages = Array.isArray(parsed.data.messages)
      ? parsed.data.messages.slice(0, LIMITS.diaryMessages)
      : [];
    const reports = Array.isArray(parsed.data.reports)
      ? parsed.data.reports.slice(0, LIMITS.diaryReports)
      : [];

    for (const session of sessions) {
      const result = await upsertDiarySession(auth.user.id, session);
      if (!result.ok) return apiJson(req, { error: result.error }, 409);
    }
    for (const message of messages) {
      const result = await upsertDiaryMessage(auth.user.id, message);
      if (!result.ok) return apiJson(req, { error: result.error }, 400);
    }
    for (const report of reports) {
      const result = await upsertDiaryReport(auth.user.id, report);
      if (!result.ok) return apiJson(req, { error: result.error }, 400);
    }

    const bundle = await loadDiaryBundle(auth.user.id);
    return apiJson(req, bundle);
  } catch (err) {
    if (err instanceof Error && err.message === "SESSION_TAKEN") {
      return apiJson(req, { error: "段落冲突。" }, 409);
    }
    return apiJson(req, { error: publicError(err, "没记下") }, 500);
  }
}
