import Taro from "@tarojs/taro";
import { getToken, clearSession } from "./session";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

function joinUrl(path: string) {
  const base = String(API_BASE_URL || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function api<T>(
  path: string,
  options: { method?: Method; data?: unknown; auth?: boolean } = {},
): Promise<T> {
  const method = options.method || "GET";
  const header: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.auth !== false) {
    const token = getToken();
    if (token) header.Authorization = `Bearer ${token}`;
  }

  const res = await Taro.request({
    url: joinUrl(path),
    method,
    data: options.data,
    header,
    timeout: 30_000,
  });

  const status = res.statusCode || 0;
  const body = (res.data || {}) as { error?: string } & T;
  if (status === 401) {
    clearSession();
    throw new ApiError(body.error || "请先登录。", 401);
  }
  if (status < 200 || status >= 300) {
    throw new ApiError(body.error || "请求没有成功。", status);
  }
  return body as T;
}
