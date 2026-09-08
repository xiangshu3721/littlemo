import { NextResponse } from "next/server";
import { clipTranscript, methodNotAllowed, publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { analyzeSession } from "@/lib/deepseek";
import { LIMITS } from "@/lib/limits";
import type { TranscriptLine } from "@/lib/types";

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateAnalyzePerMin);
  if (limited) return limited;
  try {
    const parsed = await readJsonBody<{ lines?: TranscriptLine[] }>(req, LIMITS.jsonBodyAnalyze);
    if (!parsed.ok) return parsed.response;
    const lines = clipTranscript(parsed.data.lines);
    if (!lines.length) {
      return NextResponse.json({ error: "这一段还没有可分析的话。" }, { status: 400 });
    }
    const analysis = await analyzeSession(lines);
    return NextResponse.json({ analysis });
  } catch (err) {
    return NextResponse.json({ error: publicError(err, "分析失败") }, { status: 500 });
  }
}
