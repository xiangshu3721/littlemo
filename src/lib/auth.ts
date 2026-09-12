import { prisma, type User } from "@littlemo/db";
import { SignJWT, jwtVerify } from "jose";
import { apiJson } from "./cors";
import { clipText } from "./limits";
import { markRequestUser } from "./request-context";

function jwtSecret() {
  const s = process.env.JWT_SECRET?.trim();
  if (s) return s;
  throw new Error("NO_JWT_SECRET");
}

function secretKey() {
  return new TextEncoder().encode(jwtSecret());
}

export type PublicUser = {
  id: string;
  nickname: string | null;
  avatar: string | null;
};

export function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
  };
}

export async function signUserToken(user: User) {
  return new SignJWT({ openid: user.openid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export function readBearer(req: Request) {
  const header =
    req.headers.get("authorization") || req.headers.get("x-littlemo-authorization") || "";
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  return match?.[1] || null;
}

export async function userFromRequest(req: Request) {
  const token = readBearer(req);
  if (!token) return { ok: false as const, status: 401 as const, error: "请先登录。" };
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const id = String(payload.sub || "");
    if (!id) return { ok: false as const, status: 401 as const, error: "登录已失效。" };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { ok: false as const, status: 401 as const, error: "登录已失效。" };
    markRequestUser(req, user.id);
    return { ok: true as const, user };
  } catch {
    return { ok: false as const, status: 401 as const, error: "登录已失效。" };
  }
}

type CloudbaseIdentity = {
  openid: string;
  unionid?: string;
};

function identityFromCloudbaseContext(req: Request): CloudbaseIdentity | null {
  const encoded = req.headers.get("x-cloudbase-context")?.trim();
  if (!encoded) return null;
  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const raw = Buffer.from(normalized, "base64").toString("utf8");
    const context = JSON.parse(raw) as {
      uid?: unknown;
      openId?: unknown;
      openid?: unknown;
      unionId?: unknown;
    };
    const openid = clipText(context.openId || context.openid || context.uid, 128).trim();
    if (!openid) return null;
    return {
      openid,
      unionid: clipText(context.unionId, 128).trim() || undefined,
    };
  } catch {
    return null;
  }
}

export async function wechatIdentityFromRequest(req: Request) {
  // This header is populated by CloudBase's authenticated gateway/CloudRun
  // context. Do not replace it with a client-provided uid/openid or a server
  // SDK session, which would not be bound to this HTTP request.
  return identityFromCloudbaseContext(req);
}

export async function requireUser(req: Request) {
  const result = await userFromRequest(req);
  if (!result.ok) {
    return { ok: false as const, response: apiJson(req, { error: result.error }, result.status) };
  }
  return { ok: true as const, user: result.user };
}

type WechatSession = CloudbaseIdentity & { nickname?: string };

export async function upsertWechatUser(session: WechatSession) {
  return prisma.user.upsert({
    where: { openid: session.openid },
    create: {
      openid: session.openid,
      unionid: session.unionid,
      nickname: session.nickname,
    },
    update: {
      unionid: session.unionid || undefined,
    },
  });
}
