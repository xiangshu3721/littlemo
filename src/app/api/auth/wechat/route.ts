import { publicError, rateLimit } from "@/lib/api-guard";
import {
  publicUser,
  signUserToken,
  upsertWechatUser,
  wechatIdentityFromRequest,
} from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { LIMITS } from "@/lib/limits";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateAuthPerMin);
  if (limited) return withCors(req, limited);
  try {
    const cloudbaseSession = await wechatIdentityFromRequest(req);
    if (!cloudbaseSession) {
      return apiJson(req, { error: "CloudBase 身份认证未完成。" }, 401);
    }
    const user = await upsertWechatUser(cloudbaseSession);
    const token = await signUserToken(user);
    return apiJson(req, { token, user: publicUser(user) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "登录失败") }, 500);
  }
}
