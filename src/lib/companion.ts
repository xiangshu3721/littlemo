import { wrapUntrusted } from "./api-guard";
import { LIMITS, clipText } from "./limits";

export const COMPANION_SYSTEM = `你是「有点情绪」里的倾听者。用户在向你倾诉这一刻的心情。

你只陪伴、倾听，用克制、温暖、短的中文回话。像朋友坐在旁边，不要像医生、教练、分析师或报告生成器。

禁止：
- 诊断、贴心理标签、人格/依恋/疾病判断
- 开药、治疗方案、问卷、打分
- 输出 JSON，或周报/月报/洞察/模式总结
- 不要否认自己是人工智能，不要冒充真人；用户询问身份时如实说明

可以：轻轻点出他原话里最烫的一个词，陪着他再多说一点。问句可有可无，不要连问。

如果用户流露出不想活、自伤、或正在伤害自己：先稳住他，不要深挖原因，明确建议马上联系身边的人或专业力量，并用自然语句写上：
- 当地急救 120 / 报警 110
- 心理援助热线 12356
- 不要暗示本服务能自动呼叫救援或由真人实时监护`;

export const CRISIS_COPY =
  "如果你现在不安全，请不要一个人扛。可以马上联系身边信得过的人，或打当地急救 120 / 报警 110。心理援助热线可试 12356。本服务不能代替急救或真人实时帮助。";

export function looksLikeCrisis(text: string) {
  const t = text.replace(/\s/g, "");
  return /自杀|不想活|结束自己|自伤|割腕|跳楼|结束生命|活不下去|去死|自我了断|割腕/.test(t);
}

export function replyHasHotline(text: string) {
  return /12356|120|110/.test(text);
}

export function ensureCrisisCopy(userText: string, reply: string) {
  if (!looksLikeCrisis(userText)) return reply;
  if (replyHasHotline(reply)) return reply;
  return `${reply}\n\n${CRISIS_COPY}`;
}

export function toGatewayHistory(
  rows: { role: string; content: string }[],
  latest: string,
  extras: { hasImage?: boolean } = {},
): { role: "user" | "assistant"; content: string }[] {
  const history = rows.slice(-LIMITS.historyTurns).map((row) => {
    const role: "user" | "assistant" = row.role === "assistant" ? "assistant" : "user";
    const clipped = clipText(row.content, LIMITS.lineChars);
    return {
      role,
      content: role === "user" ? wrapUntrusted("原话", clipped) : clipped,
    };
  });
  const last = history.at(-1);
  if (!last || last.role !== "user" || !latest.trim()) {
    history.push({ role: "user", content: wrapUntrusted("原话", clipText(latest, LIMITS.latestChars)) });
  }
  if (extras.hasImage) {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i].role === "user") {
        history[i] = {
          ...history[i],
          content: `${history[i].content}\n（还附了一张图，你看不到图）`,
        };
        break;
      }
    }
  }
  return history;
}
