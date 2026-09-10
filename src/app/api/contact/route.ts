import { methodNotAllowed, rateLimit } from "@/lib/api-guard";
import { getContactConfig } from "@/lib/contact";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { LIMITS } from "@/lib/limits";

export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const POST = methodNotAllowed;

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request) {
  const limited = rateLimit(req, LIMITS.rateContactPerMin);
  if (limited) return withCors(req, limited);
  return apiJson(req, { contact: getContactConfig() });
}
