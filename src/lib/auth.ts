import { prisma, type User } from "@/lib/data-store";
import { SignJWT, jwtVerify } from "jose";
import { apiJson } from "./cors";
import { AI_DATA_CONSENT_VERSION, SENSITIVE_INFO_CONSENT_VERSION, TERMS_VERSION } from "./legal";
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
  termsVersion: string | null;
  sensitiveInfoConsentVersion: string | null;
  aiDataConsentVersion: string | null;
  adultConfirmed: boolean;
};

export function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    termsVersion: user.termsVersion,
    sensitiveInfoConsentVersion: user.sensitiveInfoConsentVersion,
    aiDataConsentVersion: user.aiDataConsentVersion,
    adultConfirmed: Boolean(user.adultAgeConfirmedAt),
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

export async function userFromRequest(req: Request, options: { allowUnconsented?: boolean } = {}) {
  const token = readBearer(req);
  if (!token) return { ok: false as const, status: 401 as const, error: "请先登录。" };
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const id = String(payload.sub || "");
    if (!id) return { ok: false as const, status: 401 as const, error: "登录已失效。" };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { ok: false as const, status: 401 as const, error: "登录已失效。" };
    if (!options.allowUnconsented && user.termsVersion !== TERMS_VERSION) {
      return { ok: false as const, status: 403 as const, error: "请重新阅读并同意服务协议和隐私政策。" };
    }
    if (!options.allowUnconsented && !user.adultAgeConfirmedAt) {
      return { ok: false as const, status: 403 as const, error: "当前账号缺少适用年龄确认。" };
    }
    if (!options.allowUnconsented && user.sensitiveInfoConsentVersion !== SENSITIVE_INFO_CONSENT_VERSION) {
      return { ok: false as const, status: 403 as const, error: "请先阅读并单独同意敏感个人信息处理说明。" };
    }
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
  // CloudBase injects this header for authenticated container calls.
  const fromCloud = identityFromCloudbaseContext(req);
  if (fromCloud) return fromCloud;
  // WeChat DevTools talks to local Next without CloudBase. Keep a stable
  // development identity so login can be tested; production still requires
  // the CloudBase context.
  if (process.env.NODE_ENV !== "production") {
    return { openid: "dev-local-openid" };
  }
  return null;
}

export async function requireUser(req: Request, options: { allowUnconsented?: boolean } = {}) {
  const result = await userFromRequest(req, options);
  if (!result.ok) {
    return { ok: false as const, response: apiJson(req, { error: result.error }, result.status) };
  }
  return { ok: true as const, user: result.user };
}

type WechatSession = CloudbaseIdentity & {
  nickname?: string;
  termsVersion: string;
  sensitiveInfoConsentVersion: string;
  adultConfirmed: boolean;
};

export async function upsertWechatUser(session: WechatSession) {
  return prisma.user.upsert({
    where: { openid: session.openid },
    create: {
      openid: session.openid,
      unionid: session.unionid,
      nickname: session.nickname,
      termsVersion: session.termsVersion,
      termsConsentedAt: new Date(),
      sensitiveInfoConsentVersion: session.sensitiveInfoConsentVersion,
      sensitiveInfoConsentedAt: new Date(),
      adultAgeConfirmedAt: session.adultConfirmed ? new Date() : null,
    },
    update: {
      unionid: session.unionid || undefined,
      termsVersion: session.termsVersion,
      termsConsentedAt: new Date(),
      sensitiveInfoConsentVersion: session.sensitiveInfoConsentVersion,
      sensitiveInfoConsentedAt: new Date(),
      adultAgeConfirmedAt: session.adultConfirmed ? new Date() : undefined,
    },
  });
}

export function hasCurrentAiDataConsent(user: User) {
  return user.aiDataConsentVersion === AI_DATA_CONSENT_VERSION;
}
