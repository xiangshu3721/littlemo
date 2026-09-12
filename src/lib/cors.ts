import { NextResponse } from "next/server";
import { getRequestId, requestLogFields } from "./request-context";

function extraOrigins() {
  return (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isDevLocalOrigin(origin: string) {
  if (process.env.NODE_ENV === "production") return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function isAllowedOrigin(origin: string) {
  if (!origin) return false;
  if (extraOrigins().includes(origin)) return true;
  return isDevLocalOrigin(origin);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const headers: Record<string, string> = { Vary: "Origin" };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

export function withCors(req: Request, res: NextResponse) {
  for (const [key, value] of Object.entries(corsHeaders(req))) {
    res.headers.set(key, value);
  }
  return res;
}

export function preflight(req: Request) {
  if (!isAllowedOrigin(req.headers.get("origin") || "")) {
    return NextResponse.json({ error: "这个接口不支持该请求方式。" }, { status: 405, headers: { Allow: "GET, POST, PATCH, DELETE" } });
  }
  return withCors(req, new NextResponse(null, { status: 204 }));
}

export function apiJson(req: Request, body: unknown, status = 200) {
  const requestId = getRequestId(req);
  const res = withCors(req, NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }));
  res.headers.set("X-Request-Id", requestId);
  console.info(JSON.stringify(requestLogFields(req, status)));
  return res;
}
