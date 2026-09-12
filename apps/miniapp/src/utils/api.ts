import Taro from "@tarojs/taro";
import { getToken, clearSession } from "./session";
import { isProductionMiniProgram, requestThroughCloudbase } from "./cloudbase";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

function cloudbaseErrorMessage(err: unknown) {
  const raw = err instanceof Error ? err.message : "";
  if (/INVALID_ENV|Env invalid/i.test(raw)) {
    return "CloudBase 环境无效，请检查生产构建使用的 CLOUDBASE_ENV_ID。";
  }
  return isProductionMiniProgram() ? "CloudBase 请求失败，请稍后再试。" : "请求失败，请稍后再试。";
}

function joinUrl(path: string) {
  const base = String(API_BASE_URL || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function api<T>(
  path: string,
  options: { method?: Method; data?: unknown; auth?: boolean; timeout?: number } = {},
): Promise<T> {
  const method = options.method || "GET";
  const header: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.auth !== false) {
    const token = getToken();
    if (token) {
      header.Authorization = `Bearer ${token}`;
      header["X-Littlemo-Authorization"] = `Bearer ${token}`;
    }
  }

  const timeout = options.timeout ?? 30_000;
  let cloudResponse: Awaited<ReturnType<typeof requestThroughCloudbase<T>>>;
  try {
    cloudResponse = await requestThroughCloudbase<T>({
      path,
      method,
      data: options.data,
      header,
      timeout,
    });
  } catch (err) {
    throw new ApiError(cloudbaseErrorMessage(err), 503);
  }
  if (isProductionMiniProgram() && !cloudResponse) {
    throw new ApiError("生产环境未配置 CloudBase。", 503);
  }
  const res = cloudResponse || (await Taro.request({
    url: joinUrl(path),
    method,
    data: options.data,
    header,
    timeout,
  }));

  const status = res.statusCode || 0;
  const body = (res.data || {}) as { error?: string; success?: boolean; data?: T } & T;
  const payload = body.success === true && body.data !== undefined ? body.data : body;
  if (status === 401) {
    clearSession();
    throw new ApiError(body.error || "请先登录。", 401);
  }
  if (status < 200 || status >= 300) {
    throw new ApiError(body.error || "请求没有成功。", status);
  }
  return payload as T;
}
