import {
  asPeriodKind,
  clipPeriodEntries,
  methodNotAllowed,
  publicError,
  rateLimit,
  readJsonBody,
} from "@/lib/api-guard";
import { readBearer, requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { analyzePeriod } from "@/lib/deepseek";
import { asClientId, loadDiaryBundle, savePeriodReport } from "@/lib/diary-cloud";
import { LIMITS, clipText } from "@/lib/limits";
import type { PeriodKind, PeriodPayloadEntry } from "@/lib/types";

export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request) {
  if (!readBearer(req)) return methodNotAllowed();
  const limited = rateLimit(req, LIMITS.ratePeriodPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const bundle = await loadDiaryBundle(auth.user.id);
    return apiJson(req, { reports: bundle.reports });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "阶段读不出来") }, 500);
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.ratePeriodPerMin);
  if (limited) return withCors(req, limited);
  const authed = Boolean(readBearer(req));
  try {
    const parsed = await readJsonBody<{
      kind?: PeriodKind;
      label?: string;
      digest?: string;
      entries?: PeriodPayloadEntry[];
      periodId?: string;
    }>(req, LIMITS.jsonBodyPeriod);
    if (!parsed.ok) return withCors(req, parsed.response);
    const kind = asPeriodKind(parsed.data.kind);
    if (!kind) {
      return apiJson(req, { error: "范围不对" }, 400);
    }
    const label = clipText(parsed.data.label, 48);
    const report = await analyzePeriod(
      kind,
      label,
      clipPeriodEntries(parsed.data.entries),
      clipText(parsed.data.digest, LIMITS.digestChars),
    );

    let userId: string | null = null;
    if (authed) {
      const auth = await requireUser(req);
      if (!auth.ok) return auth.response;
      userId = auth.user.id;
      const periodId = asClientId(parsed.data.periodId);
      if (periodId) {
        await savePeriodReport(userId, {
          periodId,
          kind,
          label,
          generatedAt: new Date(),
          report: report as unknown as Record<string, unknown>,
        });
      }
    }

    return apiJson(req, { report });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "分析失败") }, 500);
  }
}
