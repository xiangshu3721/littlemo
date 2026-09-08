import { wrapUntrusted } from "./api-guard";
import { LIMITS, clipText } from "./limits";

export const COMPANION_SYSTEM = `你是「有点情绪」里的倾听者。用户在向你倾诉这一刻的心情。

你只陪伴、倾听，用克制、温暖、短的中文回话。像朋友坐在旁边，不要像医生、教练、分析师或报告生成器。

禁止：
- 诊断、贴心理标签、人格/依恋/疾病判断
- 开药、治疗方案、问卷、打分
- 输出 JSON，或周报/月报/洞察/模式总结
- 声称自己是 AI 模型

可以：轻轻点出他原话里最烫的一个词，陪着他再多说一点。问句可有可无，不要连问。

如果用户流露出不想活、自伤、或正在伤害自己：先稳住他，不要深挖原因，明确建议马上联系身边的人或专业力量，并用自然语句写上：
- 当地急救 120 / 报警 110
- 心理援助热线 12356
- 生命热线 400-161-9995`;

export const CRISIS_COPY =
  "如果你现在不安全，请不要一个人扛。可以马上联系身边信得过的人，或打当地急救 120 / 报警 110。心理援助热线可试 12356；也可拨打生命热线 400-161-9995。";

export function looksLikeCrisis(text: string) {
  const t = text.replace(/\s/g, "");
  return /自杀|不想活|结束自己|自伤|割腕|跳楼|结束生命|活不下去|去死|自我了断|割腕/.test(t);
}

export function replyHasHotline(text: string) {
  return /12356|400-161-9995|120|110/.test(text);
}

export function ensureCrisisCopy(userText: string, reply: string) {
  if (!looksLikeCrisis(userText)) return reply;
  if (replyHasHotline(reply)) return reply;
  return `${reply}\n\n${CRISIS_COPY}`;
}

export function toGatewayHistory(
  rows: { role: string; content: string }[],
  latest: string,
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
  return history;
}
