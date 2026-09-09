import { clipTranscript, methodNotAllowed, publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { analyzeSession } from "@/lib/deepseek";
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
  try {
    const parsed = await readJsonBody<{ lines?: TranscriptLine[] }>(req, LIMITS.jsonBodyAnalyze);
    if (!parsed.ok) return withCors(req, parsed.response);
    const lines = clipTranscript(parsed.data.lines);
    if (!lines.length) {
      return apiJson(req, { error: "这一段还没有可分析的话。" }, 400);
    }
    const analysis = await analyzeSession(lines);
    return apiJson(req, { analysis });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "分析失败") }, 500);
  }
}
