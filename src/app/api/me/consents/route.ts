import { prisma } from "@/lib/data-store";
import { publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { hasCurrentAiDataConsent, publicUser, requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { AI_DATA_CONSENT_VERSION, isProductionLegalGate, publicLegalInfo } from "@/lib/legal";
import { LIMITS } from "@/lib/limits";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateAuthPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const parsed = await readJsonBody<{ aiDataConsentVersion?: unknown }>(req, LIMITS.jsonBodyAuth);
    if (!parsed.ok) return withCors(req, parsed.response);
    if (parsed.data.aiDataConsentVersion !== AI_DATA_CONSENT_VERSION) {
      return apiJson(req, { error: "请先阅读当前版本的 AI 数据处理说明。" }, 403);
    }
    const legal = publicLegalInfo();
    if (isProductionLegalGate()) {
      const aiDisclosure = [
        legal.operatorName,
        legal.storageRegion,
        legal.retentionDescription,
        legal.aiServiceFiling,
        legal.aiAlgorithmFiling,
        legal.aiProcessingSummary,
        legal.aiProcessingRegion,
      ];
      if (aiDisclosure.some((value) => value.includes("待运营方补充"))) {
        return apiJson(req, { error: "运营方尚未补齐 AI 服务和数据处理说明，AI 暂不可用。" }, 503);
      }
    }
    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        aiDataConsentVersion: AI_DATA_CONSENT_VERSION,
        aiDataConsentedAt: new Date(),
      },
    });
    return apiJson(req, { user: publicUser(user) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "授权没有保存，请稍后重试") }, 500);
  }
}

export async function DELETE(req: Request) {
  const limited = rateLimit(req, LIMITS.rateAuthPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req, { allowUnconsented: true });
  if (!auth.ok) return auth.response;
  try {
    if (new URL(req.url).searchParams.get("type") === "sensitive") {
      const user = await prisma.user.update({
        where: { id: auth.user.id },
        data: { sensitiveInfoConsentVersion: null, sensitiveInfoConsentedAt: null },
      });
      return apiJson(req, { user: publicUser(user), withdrawn: true, type: "sensitive" });
    }
    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: { aiDataConsentVersion: null, aiDataConsentedAt: null },
    });
    return apiJson(req, { user: publicUser(user), withdrawn: true });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "撤回没有完成，请稍后重试") }, 500);
  }
}

export async function GET(req: Request) {
  const auth = await requireUser(req, { allowUnconsented: true });
  if (!auth.ok) return auth.response;
  return apiJson(req, {
    termsVersion: auth.user.termsVersion,
    sensitiveInfoConsentVersion: auth.user.sensitiveInfoConsentVersion,
    aiDataConsentVersion: auth.user.aiDataConsentVersion,
    aiDataConsented: hasCurrentAiDataConsent(auth.user),
  });
}
