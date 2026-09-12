import { apiJson } from "@/lib/cors";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return apiJson(req, {
    status: "ok",
    service: "littlemo-api",
    timestamp: new Date().toISOString(),
  });
}
