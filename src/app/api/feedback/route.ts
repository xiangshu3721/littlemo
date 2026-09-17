import { prisma } from "@littlemo/db";
import { publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { userFromRequest } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { LIMITS, clipText } from "@/lib/limits";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateFeedbackPerMin);
  if (limited) return withCors(req, limited);
  try {
    const parsed = await readJsonBody<{ kind?: unknown; content?: unknown; target?: unknown }>(
      req,
      LIMITS.jsonBodyFeedback,
    );
    if (!parsed.ok) return withCors(req, parsed.response);
    const kind = clipText(parsed.data.kind, 32).trim() || "report";
    if (!["report", "complaint"].includes(kind)) {
      return apiJson(req, { error: "请选择投诉或举报。" }, 400);
    }
    const content = clipText(parsed.data.content, LIMITS.feedbackChars).trim();
    if (content.length < 4) {
      return apiJson(req, { error: "请写清楚要反馈的内容。" }, 400);
    }
    const auth = await userFromRequest(req);
    const row = await prisma.feedback.create({
      data: {
        kind,
        content,
        target: clipText(parsed.data.target, 120).trim() || null,
        userId: auth.ok ? auth.user.id : null,
      },
    });
    return apiJson(req, { ok: true, id: row.id });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "反馈没送出") }, 500);
  }
}
