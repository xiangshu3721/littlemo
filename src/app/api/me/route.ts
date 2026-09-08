import { publicError, rateLimit } from "@/lib/api-guard";
import { publicUser, requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { LIMITS } from "@/lib/limits";

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
