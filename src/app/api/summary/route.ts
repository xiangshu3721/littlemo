import { clipTranscript, methodNotAllowed, publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { readBearer, requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { composePatternSummary } from "@/lib/deepseek";
import {
  asClientId,
  savePatternSummary,
  savePatternSummaryStatus,
} from "@/lib/diary-cloud";
import { LIMITS } from "@/lib/limits";
import type { Analysis, TranscriptLine } from "@/lib/types";

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateSummaryPerMin);
  if (limited) return withCors(req, limited);
  const authed = Boolean(readBearer(req));
  try {
    const parsed = await readJsonBody<{
      lines?: TranscriptLine[];
      sessionId?: string;
      analysis?: Analysis | null;
    }>(req, LIMITS.jsonBodyAnalyze);
    if (!parsed.ok) return withCors(req, parsed.response);
    const lines = clipTranscript(parsed.data.lines);
    if (!lines.length) {
      return apiJson(req, { error: "这一段还没有可整理的话。" }, 400);
    }

    let userId: string | null = null;
    const sessionId = asClientId(parsed.data.sessionId);
    if (authed) {
      const auth = await requireUser(req);
      if (!auth.ok) return auth.response;
      userId = auth.user.id;
      if (sessionId) {
        await savePatternSummaryStatus(userId, sessionId, {
          patternSummaryStatus: "pending",
          patternSummaryError: null,
        });
      }
    }

    try {
      const summary = await composePatternSummary(lines, parsed.data.analysis);
      if (userId && sessionId) {
        await savePatternSummary(userId, sessionId, summary);
      }
      return apiJson(req, { summary });
    } catch (err) {
      if (userId && sessionId) {
        await savePatternSummaryStatus(userId, sessionId, {
          patternSummaryStatus: "error",
          patternSummaryError: publicError(err, "小结没写出来"),
        });
      }
      throw err;
    }
  } catch (err) {
    return apiJson(req, { error: publicError(err, "小结没写出来") }, 500);
  }
}
