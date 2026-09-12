import { prisma } from "@littlemo/db";
import { publicError } from "@/lib/api-guard";
import { wechatIdentityFromRequest } from "@/lib/auth";
import { apiJson } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return apiJson(req, { status: "ok", database: "ok" });
  } catch (err) {
    return apiJson(req, {
      status: "error",
      database: "unavailable",
      error: publicError(err, "数据库还没连上。"),
    }, 503);
  }
}

// Temporary production self-check endpoint. The write/read probe stays inside
// one transaction and uses a temporary table, so it never creates business data.
export async function POST(req: Request) {
  const identity = await wechatIdentityFromRequest(req);
  if (!identity) return apiJson(req, { error: "CloudBase 身份认证未完成。" }, 401);

  try {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'CREATE TEMP TABLE "littlemo_diagnostic_probe" ("id" text PRIMARY KEY, "value" text NOT NULL) ON COMMIT DROP',
      );
      await tx.$executeRaw`INSERT INTO "littlemo_diagnostic_probe" ("id", "value") VALUES (${"probe"}, ${"round-trip-ok"})`;
      return tx.$queryRaw<Array<{ id: string; value: string }>>`
        SELECT "id", "value" FROM "littlemo_diagnostic_probe" WHERE "id" = ${"probe"}
      `;
    });
    const row = rows[0];
    if (!row || row.value !== "round-trip-ok") {
      return apiJson(req, { error: "数据库写入后读取结果不一致。" }, 503);
    }
    return apiJson(req, { status: "ok", write: "ok", read: "ok" });
  } catch (err) {
    return apiJson(req, { status: "error", write: "failed", read: "failed", error: publicError(err, "数据库写入读取失败。") }, 503);
  }
}
