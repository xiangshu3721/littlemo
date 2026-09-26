import { publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import {
  publicUser,
  signUserToken,
  upsertWechatUser,
  wechatIdentityFromRequest,
} from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { ADULT_AGE_SCOPE, isProductionLegalGate, publicLegalInfo, SENSITIVE_INFO_CONSENT_VERSION, TERMS_VERSION } from "@/lib/legal";
import { LIMITS } from "@/lib/limits";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateAuthPerMin);
  if (limited) return withCors(req, limited);
  try {
    const parsed = await readJsonBody<{
      termsVersion?: unknown;
      sensitiveInfoConsentVersion?: unknown;
      adultConfirmed?: unknown;
    }>(req, LIMITS.jsonBodyAuth);
    if (!parsed.ok) return withCors(req, parsed.response);
    if (parsed.data.termsVersion !== TERMS_VERSION) {
      return apiJson(req, { error: "请先阅读并同意当前版本的服务协议和隐私政策。" }, 403);
    }
    if (parsed.data.sensitiveInfoConsentVersion !== SENSITIVE_INFO_CONSENT_VERSION) {
      return apiJson(req, { error: "请先阅读并单独同意敏感个人信息处理说明。" }, 403);
    }
    const legal = publicLegalInfo();
    if (isProductionLegalGate()) {
      const requiredDisclosure = [
        legal.operatorName,
        legal.privacyContact,
        legal.complaintContact,
        legal.complaintResponseTime,
        legal.ageScope,
        legal.storageRegion,
        legal.retentionDescription,
        legal.miniProgramFiling,
      ];
      if (requiredDisclosure.some((value) => value.includes("待运营方补充"))) {
        return apiJson(req, { error: "运营方尚未补齐个人信息处理和联系信息，暂不开放注册。" }, 503);
      }
      if (process.env.LEGAL_AGE_SCOPE?.trim() !== ADULT_AGE_SCOPE || parsed.data.adultConfirmed !== true) {
        return apiJson(req, { error: "当前服务尚未完成适用年龄确认，暂不开放注册。" }, 403);
      }
    } else if (parsed.data.adultConfirmed !== true) {
      return apiJson(req, { error: "请先确认已年满18周岁。" }, 403);
    }
    const cloudbaseSession = await wechatIdentityFromRequest(req);
    if (!cloudbaseSession) {
      return apiJson(req, { error: "CloudBase 身份认证未完成。" }, 401);
    }
    const user = await upsertWechatUser({
      ...cloudbaseSession,
      termsVersion: TERMS_VERSION,
      sensitiveInfoConsentVersion: SENSITIVE_INFO_CONSENT_VERSION,
      adultConfirmed: true,
    });
    const token = await signUserToken(user);
    return apiJson(req, { token, user: publicUser(user) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "登录失败") }, 500);
  }
}
