import {
  asPeriodKind,
  clipPeriodEntries,
  methodNotAllowed,
  publicError,
  rateLimit,
  readJsonBody,
} from "@/lib/api-guard";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { analyzePeriod } from "@/lib/deepseek";
import { LIMITS, clipText } from "@/lib/limits";
import type { PeriodKind, PeriodPayloadEntry } from "@/lib/types";

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.ratePeriodPerMin);
  if (limited) return withCors(req, limited);
  try {
    const parsed = await readJsonBody<{
      kind?: PeriodKind;
      label?: string;
      digest?: string;
      entries?: PeriodPayloadEntry[];
    }>(req, LIMITS.jsonBodyPeriod);
    if (!parsed.ok) return withCors(req, parsed.response);
    const kind = asPeriodKind(parsed.data.kind);
    if (!kind) {
      return apiJson(req, { error: "范围不对" }, 400);
    }
    const report = await analyzePeriod(
      kind,
      clipText(parsed.data.label, 48),
      clipPeriodEntries(parsed.data.entries),
      clipText(parsed.data.digest, LIMITS.digestChars),
    );
    return apiJson(req, { report });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "分析失败") }, 500);
  }
}
