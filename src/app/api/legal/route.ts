import { apiJson } from "@/lib/cors";
import { publicLegalInfo } from "@/lib/legal";

export function GET(req: Request) {
  return apiJson(req, publicLegalInfo());
}
