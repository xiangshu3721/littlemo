import { NextResponse } from "next/server";
import {
  asPeriodKind,
  clipPeriodEntries,
  methodNotAllowed,
  publicError,
  rateLimit,
  readJsonBody,
} from "@/lib/api-guard";
import { analyzePeriod } from "@/lib/deepseek";
import { LIMITS, clipText } from "@/lib/limits";
import type { PeriodKind, PeriodPayloadEntry } from "@/lib/types";

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.ratePeriodPerMin);
  if (limited) return limited;
  try {
    const parsed = await readJsonBody<{
      kind?: PeriodKind;
      label?: string;
      digest?: string;
      entries?: PeriodPayloadEntry[];
    }>(req, LIMITS.jsonBodyPeriod);
    if (!parsed.ok) return parsed.response;
    const kind = asPeriodKind(parsed.data.kind);
    if (!kind) {
      return NextResponse.json({ error: "范围不对" }, { status: 400 });
    }
    const report = await analyzePeriod(
      kind,
      clipText(parsed.data.label, 48),
      clipPeriodEntries(parsed.data.entries),
      clipText(parsed.data.digest, LIMITS.digestChars),
    );
    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json({ error: publicError(err, "分析失败") }, { status: 500 });
  }
}
