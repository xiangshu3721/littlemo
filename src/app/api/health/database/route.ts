import { prisma } from "@/lib/data-store";
import { publicError } from "@/lib/api-guard";
import { apiJson } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // A read-only RDB call verifies CloudRun -> CloudBase PostgreSQL without
    // creating a probe row or requiring direct PostgreSQL TCP transactions.
    await prisma.user.findMany({ select: { id: true }, take: 1 });
    return apiJson(req, { status: "ok", database: "ok" });
  } catch (err) {
    return apiJson(req, {
      status: "error",
      database: "unavailable",
      error: publicError(err, "数据库还没连上。"),
    }, 503);
  }
}
