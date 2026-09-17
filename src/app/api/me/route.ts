import { prisma } from "@littlemo/db";
import { publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { publicUser, requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { LIMITS, clipText, isSafeImageDataUrl } from "@/lib/limits";
import { assertUserTextSafe } from "@/lib/wechat-sec";

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
    const parsed = await readJsonBody<{ avatar?: unknown; nickname?: unknown }>(req, LIMITS.jsonBodyMe);
    if (!parsed.ok) return withCors(req, parsed.response);

    const hasAvatar = Object.prototype.hasOwnProperty.call(parsed.data, "avatar");
    const hasNickname = Object.prototype.hasOwnProperty.call(parsed.data, "nickname");
    if (!hasAvatar && !hasNickname) {
      return apiJson(req, { error: "没有要更新的内容" }, 400);
    }

    const data: { avatar?: string; nickname?: string } = {};

    if (hasAvatar) {
      const avatar = String(parsed.data.avatar ?? "").replace(/\s/g, "");
      if (!isSafeImageDataUrl(avatar)) {
        return apiJson(req, { error: "头像换不了，换一张小一点的 jpg 或 png。" }, 400);
      }
      data.avatar = avatar;
    }

    if (hasNickname) {
      const nickname = clipText(parsed.data.nickname, LIMITS.nickname).trim();
      if (!nickname) {
        return apiJson(req, { error: "昵称不能为空" }, 400);
      }
      await assertUserTextSafe({ openid: auth.user.openid, content: nickname, scene: 1 });
      data.nickname = nickname;
    }

    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data,
    });
    return apiJson(req, { user: publicUser(user) });
  } catch (err) {
    if (err instanceof Error && err.message === "CONTENT_BLOCKED") {
      return apiJson(req, { error: publicError(err, "这句话过不了内容安全检查，换一种说法。") }, 400);
    }
    return apiJson(req, { error: publicError(err, "资料没存上") }, 500);
  }
}

export async function DELETE(req: Request) {
  const limited = rateLimit(req, LIMITS.rateAuthPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    await prisma.user.delete({ where: { id: auth.user.id } });
    return apiJson(req, { ok: true });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "账号没注销掉") }, 500);
  }
}
