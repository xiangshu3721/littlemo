import { prisma } from "@/lib/data-store";
import { publicError, rateLimit } from "@/lib/api-guard";
import { requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { LIMITS } from "@/lib/limits";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request) {
  const limited = rateLimit(req, LIMITS.rateNotesPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req, { allowUnconsented: true });
  if (!auth.ok) return auth.response;
  try {
    const [notes, chatMessages, diarySessions, periodReports] = await Promise.all([
      prisma.note.findMany({ where: { userId: auth.user.id }, orderBy: { createdAt: "asc" } }),
      prisma.chatMessage.findMany({ where: { userId: auth.user.id }, orderBy: { createdAt: "asc" } }),
      prisma.diarySession.findMany({ where: { userId: auth.user.id }, orderBy: { startedAt: "asc" } }),
      prisma.periodReport.findMany({ where: { userId: auth.user.id }, orderBy: { generatedAt: "asc" } }),
    ]);
    return apiJson(req, {
      format: "littlemo-account-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      user: {
        id: auth.user.id,
        openid: auth.user.openid,
        nickname: auth.user.nickname,
        avatar: auth.user.avatar,
        createdAt: auth.user.createdAt,
        updatedAt: auth.user.updatedAt,
        termsVersion: auth.user.termsVersion,
        termsConsentedAt: auth.user.termsConsentedAt,
        sensitiveInfoConsentVersion: auth.user.sensitiveInfoConsentVersion,
        sensitiveInfoConsentedAt: auth.user.sensitiveInfoConsentedAt,
        aiDataConsentVersion: auth.user.aiDataConsentVersion,
        aiDataConsentedAt: auth.user.aiDataConsentedAt,
        adultAgeConfirmedAt: auth.user.adultAgeConfirmedAt,
      },
      notes,
      chatMessages,
      diarySessions,
      periodReports,
    });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "数据副本暂时生成不了") }, 500);
  }
}
