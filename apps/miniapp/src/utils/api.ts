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

function taroFailMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err && "errMsg" in err) {
    const msg = String((err as { errMsg?: string }).errMsg || "");
    if (/url not in domain list|不在.*合法域名/i.test(msg)) {
      return "接口域名未配置，请在开发者工具关闭 URL 校验或配置服务器域名。";
    }
    if (/fail|timeout|连接|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
      return "连不上本地接口，请确认已启动 http://127.0.0.1:3000。";
    }
    return msg.slice(0, 40) || "请求失败，请稍后再试。";
  }
  return isProductionMiniProgram() ? "CloudBase 请求失败，请稍后再试。" : "请求失败，请稍后再试。";
}

function cloudbaseErrorMessage(err: unknown) {
  const raw = err instanceof Error ? err.message : taroFailMessage(err);
  if (/INVALID_ENV|Env invalid/i.test(raw)) {
    return "CloudBase 环境无效，请检查生产构建使用的 CLOUDBASE_ENV_ID。";
  }
  if (raw && raw !== "请求失败，请稍后再试。" && raw !== "CloudBase 请求失败，请稍后再试。") {
    return raw;
  }
  return isProductionMiniProgram() ? "CloudBase 请求失败，请稍后再试。" : taroFailMessage(err);
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
  let res: { statusCode?: number; data?: unknown };
  try {
    res = cloudResponse || (await Taro.request({
      url: joinUrl(path),
      method,
      data: options.data,
      header,
      timeout,
    }));
  } catch (err) {
    throw new ApiError(taroFailMessage(err), 503);
  }

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
