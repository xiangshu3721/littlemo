import { publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { publicUser, signUserToken, upsertWechatUser, wechatSessionFromCode } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { LIMITS, clipText } from "@/lib/limits";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateAuthPerMin);
  if (limited) return withCors(req, limited);
  try {
    const parsed = await readJsonBody<{ code?: string }>(req, LIMITS.jsonBodyAuth);
    if (!parsed.ok) return withCors(req, parsed.response);
    const code = clipText(parsed.data.code, 128).trim();
    if (!code) return apiJson(req, { error: "需要微信登录码。" }, 400);
    const session = await wechatSessionFromCode(code);
    const user = await upsertWechatUser(session);
    const token = await signUserToken(user);
    return apiJson(req, { token, user: publicUser(user) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "登录失败") }, 500);
  }
}
