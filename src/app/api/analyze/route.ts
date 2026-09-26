import { clipTranscript, methodNotAllowed, publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { hasCurrentAiDataConsent, readBearer, requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { analyzeSession } from "@/lib/deepseek";
import { asClientId, saveSessionAnalysis, saveSessionStatus } from "@/lib/diary-cloud";
import { LIMITS } from "@/lib/limits";
import type { TranscriptLine } from "@/lib/types";

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateAnalyzePerMin);
  if (limited) return withCors(req, limited);
  const authed = Boolean(readBearer(req));
  try {
    const parsed = await readJsonBody<{ lines?: TranscriptLine[]; sessionId?: string }>(
      req,
      LIMITS.jsonBodyAnalyze,
    );
    if (!parsed.ok) return withCors(req, parsed.response);
    const lines = clipTranscript(parsed.data.lines);
    if (!lines.length) {
      return apiJson(req, { error: "这一段还没有可分析的话。" }, 400);
    }

    let userId: string | null = null;
    const sessionId = asClientId(parsed.data.sessionId);
    if (authed) {
      const auth = await requireUser(req);
      if (!auth.ok) return auth.response;
      if (!hasCurrentAiDataConsent(auth.user)) {
        return apiJson(req, { error: "请先阅读并同意 AI 数据处理说明。" }, 403);
      }
      userId = auth.user.id;
      if (sessionId) {
        await saveSessionStatus(userId, sessionId, { analysisStatus: "pending", analysisError: null });
      }
    }

    try {
      const analysis = await analyzeSession(lines);
      if (userId && sessionId) {
        await saveSessionAnalysis(userId, sessionId, analysis, {
          title: analysis.title,
          mood: analysis.suggestedMood,
          status: "done",
        });
      }
      return apiJson(req, { analysis });
    } catch (err) {
      if (userId && sessionId) {
        await saveSessionStatus(userId, sessionId, {
          analysisStatus: "error",
          analysisError: publicError(err, "分析失败"),
        });
      }
      throw err;
    }
  } catch (err) {
    const res = apiJson(req, { error: publicError(err, "分析失败") }, 500);
    return res;
  }
}
