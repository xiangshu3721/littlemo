import { Button, Text, View } from "@tarojs/components";
import { useState } from "react";
import {
  requestThroughCloudbase,
  signInWithOpenIdForDiagnostics,
} from "../../utils/cloudbase";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

type CheckState = "pending" | "running" | "success" | "failed";

type CheckResult = {
  key: string;
  label: string;
  state: CheckState;
  requestId: string;
  error: string;
  detail: string;
};

const CHECKS: Array<Pick<CheckResult, "key" | "label">> = [
  { key: "auth", label: "CloudBase 微信身份登录" },
  { key: "health", label: "云托管健康检查" },
  { key: "database", label: "数据库连接检查" },
];

function initialResults(): CheckResult[] {
  return CHECKS.map((check) => ({
    ...check,
    state: "pending",
    requestId: "—",
    error: "",
    detail: "等待执行",
  }));
}

function sanitizedError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "未知错误");
  if (/access[_ -]?token|refresh[_ -]?token|database[_ -]?url|api[_ -]?key|appsecret|authorization|bearer\s|sk-/i.test(raw)) {
    return "错误信息包含敏感内容，已隐藏。";
  }
  const clean = raw
    .replace(/https?:\/\/\S+/gi, "[链接已隐藏]")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[长标识已隐藏]")
    .trim();
  return clean ? clean.slice(0, 160) : "请求失败，未返回错误详情。";
}

function responseError(response: { statusCode: number; data: unknown }) {
  if (response.statusCode >= 200 && response.statusCode < 300) return "";
  const body = response.data && typeof response.data === "object" ? response.data as { error?: unknown } : {};
  return sanitizedError(body.error || `HTTP ${response.statusCode}`);
}

export default function DiagnosticsPage() {
  const theme = usePageTheme();
  const [results, setResults] = useState<CheckResult[]>(initialResults);
  const [running, setRunning] = useState(false);

  function update(key: string, patch: Partial<CheckResult>) {
    setResults((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function runCheck() {
    if (running) return;
    setResults(initialResults());
    setRunning(true);

    try {
      update("auth", { state: "running", detail: "正在调用 signInWithOpenId" });
      try {
        const auth = await signInWithOpenIdForDiagnostics();
        update("auth", { state: "success", requestId: auth.requestId, detail: "useWxCloud:false 登录成功" });
      } catch (error) {
        update("auth", { state: "failed", requestId: requestIdFrom(error), error: sanitizedError(error), detail: "身份登录失败" });
        return;
      }

      if (!(await runContainerCheck("health", "/api/health", "服务健康检查成功"))) return;
      await runContainerCheck("database", "/api/health/database", "CloudBase PostgreSQL 只读访问成功");
    } finally {
      setRunning(false);
    }
  }

  async function runContainerCheck(
    key: string,
    path: string,
    detail: string,
  ) {
    const method = "GET" as const;
    update(key, { state: "running", detail: `正在调用 ${method} ${path}` });
    try {
      const response = await requestThroughCloudbase<{ error?: string }>({
        path,
        method,
        header: { "Content-Type": "application/json" },
        timeout: 30_000,
      });
      if (!response) throw new Error("CloudBase 未配置。");
      const error = responseError(response);
      if (error) {
        update(key, { state: "failed", requestId: response.requestId || "未返回", error, detail: "请求失败" });
        return false;
      }
      update(key, { state: "success", requestId: response.requestId || "未返回", detail });
      return true;
    } catch (error) {
      update(key, { state: "failed", requestId: requestIdFrom(error), error: sanitizedError(error), detail: "请求失败" });
      return false;
    }
  }

  return (
    <View className={`diagnostics ${theme.className}`}>
      <Text className="diagnostics__title">生产环境自检</Text>
      <Text className="diagnostics__hint">仅开发/调试构建可用；不会显示 Token、数据库连接串或服务密钥。</Text>
      <View className="diagnostics__list">
        {results.map((item, index) => (
          <View className="diagnostics__item" key={item.key}>
            <View className="diagnostics__row">
              <Text className="diagnostics__index">{index + 1}</Text>
              <Text className="diagnostics__label">{item.label}</Text>
              <Text className={`diagnostics__state diagnostics__state--${item.state}`}>
                {stateLabel(item.state)}
              </Text>
            </View>
            <Text className="diagnostics__detail">{item.detail}</Text>
            <Text className="diagnostics__request">requestId：{item.requestId}</Text>
            {item.error ? <Text className="diagnostics__error">错误：{item.error}</Text> : null}
          </View>
        ))}
      </View>
      <Button className="diagnostics__button" disabled={running} onClick={runCheck}>
        {running ? "自检进行中…" : "开始自检"}
      </Button>
    </View>
  );
}

function stateLabel(state: CheckState) {
  if (state === "running") return "执行中";
  if (state === "success") return "成功";
  if (state === "failed") return "失败";
  return "待执行";
}

function requestIdFrom(error: unknown) {
  const value = error && typeof error === "object" ? (error as { requestId?: unknown }).requestId : "";
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : "未返回";
}
