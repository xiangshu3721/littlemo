import { prisma, type User } from "@littlemo/db";
import { SignJWT, jwtVerify } from "jose";
import { apiJson } from "./cors";
import { clipText } from "./limits";

const MOCK_JWT_SECRET = "dev-only-jwt-secret-not-for-production";

export function wechatMockEnabled() {
  const v = (process.env.WECHAT_MOCK || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function jwtSecret() {
  const s = process.env.JWT_SECRET?.trim();
  if (s) return s;
  if (wechatMockEnabled()) return MOCK_JWT_SECRET;
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
  const header = req.headers.get("authorization") || "";
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
    return { ok: true as const, user };
  } catch {
    return { ok: false as const, status: 401 as const, error: "登录已失效。" };
  }
}

export async function requireUser(req: Request) {
  const result = await userFromRequest(req);
  if (!result.ok) {
    return { ok: false as const, response: apiJson(req, { error: result.error }, result.status) };
  }
  return { ok: true as const, user: result.user };
}

type WechatSession = {
  openid: string;
  unionid?: string;
  nickname?: string;
};

export async function wechatSessionFromCode(code: string): Promise<WechatSession> {
  const trimmed = clipText(code, 128).trim();
  if (!trimmed) throw new Error("需要微信登录码。");

  if (wechatMockEnabled()) {
    return {
      openid: `mock:${trimmed}`,
      nickname: "本地测试",
    };
  }

  const appid = process.env.WECHAT_APPID?.trim();
  const secret = process.env.WECHAT_SECRET?.trim();
  if (!appid || !secret) {
    throw new Error("NO_WECHAT");
  }

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);
  url.searchParams.set("js_code", trimmed);
  url.searchParams.set("grant_type", "authorization_code");

  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error("UPSTREAM");
  const data = (await res.json()) as {
    openid?: string;
    unionid?: string;
    errcode?: number;
    errmsg?: string;
  };
  if (!data.openid) throw new Error("WECHAT_CODE");
  return { openid: data.openid, unionid: data.unionid };
}

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
