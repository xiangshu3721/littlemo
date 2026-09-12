import cloudbase from "@cloudbase/js-sdk";

type CloudbaseApp = ReturnType<typeof cloudbase.init>;

let app: CloudbaseApp | null = null;
let ready: Promise<CloudbaseApp> | null = null;
let authReady: Promise<void> | null = null;

export function isCloudBaseConfigured() {
  return process.env.TARO_ENV === "weapp" && Boolean(String(CLOUDBASE_ENV_ID || "").trim());
}

export function isProductionMiniProgram() {
  return process.env.TARO_ENV === "weapp" && process.env.NODE_ENV === "production";
}

async function getApp() {
  if (!isCloudBaseConfigured()) return null;
  if (app) return app;
  if (!ready) {
    ready = (async () => {
      const initialized = cloudbase.init({ env: String(CLOUDBASE_ENV_ID).trim() });
      app = initialized;
      return initialized;
    })();
  }
  return ready;
}

async function ensureCloudBaseAuth(currentApp: CloudbaseApp) {
  if (!authReady) {
    authReady = currentApp
      .auth()
      .signInWithOpenId({ useWxCloud: false })
      .then((result) => {
        if (result.error) throw result.error;
      })
      .catch((error) => {
        authReady = null;
        throw error;
      });
  }
  return authReady;
}

export async function signInWithOpenIdForDiagnostics() {
  const currentApp = await getApp();
  if (!currentApp) throw new Error("CloudBase 未配置。");
  await ensureCloudBaseAuth(currentApp);
  return { requestId: "SDK 未返回" };
}

function responseRequestId(response: unknown) {
  if (!response || typeof response !== "object") return "";
  const row = response as Record<string, unknown>;
  const direct = typeof row.requestId === "string" ? row.requestId : "";
  const header = row.header;
  const fromHeader =
    header && typeof (header as { get?: unknown }).get === "function"
      ? (header as { get(name: string): string | null }).get("x-request-id") || ""
      : header && typeof header === "object"
        ? String(
            (header as Record<string, unknown>)["x-request-id"] ||
              (header as Record<string, unknown>)["X-Request-Id"] ||
              "",
          )
        : "";
  const value = (direct || fromHeader).trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : "";
}

function parseBody(value: unknown) {
  if (typeof value !== "string") return value || {};
  try {
    return JSON.parse(value);
  } catch {
    return { error: value };
  }
}

export async function requestThroughCloudbase<T>(options: {
  path: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  data?: unknown;
  header: Record<string, string>;
  timeout: number;
}) {
  const currentApp = await getApp();
  if (!currentApp) return null;
  await ensureCloudBaseAuth(currentApp);

  // Authorization is reserved for CloudBase's own access token. The app JWT
  // travels in a separate header so it cannot replace the CloudBase identity.
  const header = { ...options.header };
  delete header.Authorization;
  const response = await currentApp.callContainer(
    {
      name: String(CLOUDBASE_SERVICE_NAME || "littlemo-api").trim(),
      path: options.path,
      method: options.method,
      data: options.data as Record<string, unknown> | undefined,
      header,
    },
    { timeout: options.timeout },
  );
  const body = response.data ?? (response as { result?: unknown }).result;
  return {
    statusCode: response.statusCode || 200,
    data: parseBody(body) as T,
    requestId: responseRequestId(response),
  };
}
