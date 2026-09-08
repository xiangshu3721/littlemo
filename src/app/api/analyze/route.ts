import { NextResponse } from "next/server";
import { analyzeSession } from "@/lib/deepseek";
import type { TranscriptLine } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lines?: TranscriptLine[] };
    const lines = Array.isArray(body.lines) ? body.lines.filter((l) => l.text?.trim()) : [];
    if (!lines.length) {
      return NextResponse.json({ error: "这一段还没有可分析的话。" }, { status: 400 });
    }
    const analysis = await analyzeSession(lines);
    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "分析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
