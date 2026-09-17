import { Button, Text, Textarea, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState } from "react";
import { api, ApiError } from "../../utils/api";
import { ensurePrivacyAuthorized } from "../../utils/privacy";
import { usePageTheme } from "../../utils/theme";
import "./index.scss";

export default function ReportPage() {
  const theme = usePageTheme();
  const [kind, setKind] = useState<"report" | "complaint">("report");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const text = content.trim();
    if (text.length < 4) {
      Taro.showToast({ title: "请写清楚要反馈的内容", icon: "none" });
      return;
    }
    if (!(await ensurePrivacyAuthorized())) {
      Taro.showToast({ title: "请先同意隐私保护指引", icon: "none" });
      return;
    }
    setBusy(true);
    try {
      await api("/api/feedback", {
        method: "POST",
        data: { kind, content: text },
      });
      Taro.showToast({ title: "已收到", icon: "none" });
      setTimeout(() => Taro.navigateBack(), 400);
    } catch (err) {
      Taro.showToast({
        title: err instanceof ApiError ? err.message : "这次没送出",
        icon: "none",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className={`report ${theme.className}`}>
      <Text className="report__lead">若对话或生成内容不当，请告诉我们。登录后提交会附上账号，方便处理。</Text>
      <View className="report__kinds">
        <Button className={`report__kind${kind === "report" ? " report__kind--on" : ""}`} onClick={() => setKind("report")}>
          举报内容
        </Button>
        <Button
          className={`report__kind${kind === "complaint" ? " report__kind--on" : ""}`}
          onClick={() => setKind("complaint")}
        >
          投诉建议
        </Button>
      </View>
      <Textarea
        className="report__input"
        maxlength={2000}
        autoHeight
        placeholder="请描述情况，不要填写与本案无关的隐私。"
        value={content}
        onInput={(e) => setContent(e.detail.value)}
      />
      <Button className="report__submit" disabled={busy} onClick={() => void submit()}>
        {busy ? "在送…" : "提交"}
      </Button>
    </View>
  );
}
