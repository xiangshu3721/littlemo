const requestIds = new WeakMap<Request, string>();
const requestStartedAt = new WeakMap<Request, number>();
const requestUsers = new WeakMap<Request, string>();

function safeRequestId(value: string | null) {
  const id = (value || "").trim();
  return id && id.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(id) ? id : "";
}

function newRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getRequestId(req: Request) {
  const existing = requestIds.get(req);
  if (existing) return existing;
  const id = safeRequestId(req.headers.get("x-request-id")) || newRequestId();
  requestIds.set(req, id);
  requestStartedAt.set(req, Date.now());
  return id;
}

export function markRequestUser(req: Request, userId: string) {
  requestUsers.set(req, userId);
}

export function requestLogFields(req: Request, status: number) {
  return {
    requestId: getRequestId(req),
    userId: requestUsers.get(req) || undefined,
    api: new URL(req.url).pathname,
    status,
    duration: Date.now() - (requestStartedAt.get(req) || Date.now()),
    timestamp: new Date().toISOString(),
  };
}
