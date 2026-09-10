import { prisma } from "@littlemo/db";
import { publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { publicUser, requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { LIMITS, isSafeImageDataUrl } from "@/lib/limits";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request) {
  const limited = rateLimit(req, LIMITS.rateNotesPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    return apiJson(req, { user: publicUser(auth.user) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "读不到资料") }, 500);
  }
}

export async function PATCH(req: Request) {
  const limited = rateLimit(req, LIMITS.rateAuthPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const parsed = await readJsonBody<{ avatar?: unknown }>(req, LIMITS.jsonBodyMe);
    if (!parsed.ok) return withCors(req, parsed.response);
    const avatar = String(parsed.data.avatar ?? "").replace(/\s/g, "");
    if (!isSafeImageDataUrl(avatar)) {
      return apiJson(req, { error: "头像换不了，换一张小一点的 jpg 或 png。" }, 400);
    }
    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: { avatar },
    });
    return apiJson(req, { user: publicUser(user) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "头像没换上") }, 500);
  }
}
