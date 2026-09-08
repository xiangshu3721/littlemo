import { NextResponse } from "next/server";
import { analyzePeriod } from "@/lib/deepseek";
import type { PeriodKind, PeriodPayloadEntry } from "@/lib/types";

const KINDS: PeriodKind[] = ["week", "month", "days90"];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      kind?: PeriodKind;
      label?: string;
      digest?: string;
      entries?: PeriodPayloadEntry[];
    };
    if (!body.kind || !KINDS.includes(body.kind)) {
      return NextResponse.json({ error: "范围不对" }, { status: 400 });
    }
    const report = await analyzePeriod(
      body.kind,
      body.label || "",
      Array.isArray(body.entries) ? body.entries : [],
      body.digest || "",
    );
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "分析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
