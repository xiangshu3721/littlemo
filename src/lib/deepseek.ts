import { wrapUntrusted } from "./api-guard";
import { MOODS } from "./moods";
import type { EmotionStage, InteractionKind, ReplyMode } from "./guide";
import { REPLY_MODES, STAGES, safetyResources, wantsCloseEpisode } from "./guide";
import { COACH_SYSTEM, coachTurnHint, isShortAck } from "./coach";
import { LIMITS, clipText } from "./limits";
import type {
  Analysis,
  ChatLine,
  GuideContext,
  GuideTurn,
  MemoryPack,
  MoodId,
  PeriodKind,
  PeriodPayloadEntry,
  PeriodReport,
  TranscriptLine,
} from "./types";

const BASE = "https://api.deepseek.com";

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("模型没有返回 JSON");
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

async function chatJson(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  temperature: number,
) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("NO_KEY");
  }
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    try {
      await res.text();
    } catch {
      /* ignore upstream body */
    }
    throw new Error("UPSTREAM");
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("BAD_MODEL");
  try {
    return extractJson(content);
  } catch {
    throw new Error("BAD_MODEL");
  }
}

const MOOD_IDS = MOODS.map((m) => m.id).join("、");

function clipMemory(text: string, max = LIMITS.memoryChars) {
  if (text.length <= max) return text;
  return "（更早的记录已省略）\n" + text.slice(text.length - max);
}

function formatMemory(memory?: MemoryPack) {
  if (!memory || (!memory.sessions.length && !memory.earlierChat.length)) {
    return "（这是我们第一次聊，还没有更早的记录）";
  }
  const sessionBlock = memory.sessions.length
    ? memory.sessions
        .map((s) => {
          const bits = [
            `${s.day}「${s.title || "一段记录"}」`,
            s.quotes.length ? `原话：${s.quotes.join(" / ")}` : "",
            s.facts ? `事实：${s.facts}` : "",
            s.emotions?.length ? `情绪：${s.emotions.join("、")}` : "",
            s.needs ? `需要：${s.needs}` : "",
          ].filter(Boolean);
          return `- ${bits.join("。")}`;
        })
        .join("\n")
    : "（还没有更早的段落）";
  const chatBlock = memory.earlierChat.length
    ? memory.earlierChat
        .map((line) => `${line.day ? `${line.day} ` : ""}${line.role === "user" ? "我" : "你"}：${line.text}`)
        .join("\n")
    : "（没有更早的原话）";
  return clipMemory(`以前记下的段落：\n${sessionBlock}\n\n以前聊过的原话：\n${chatBlock}`);
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((s) => s.trim()).filter(Boolean);
}

function parseGuideTurn(data: Record<string, unknown>, region?: string): GuideTurn {
  const episode = (data.episode || {}) as Record<string, unknown>;
  const state = (data.state || {}) as Record<string, unknown>;
  const emotion = (data.emotion || {}) as Record<string, unknown>;
  const reply = (data.reply || {}) as Record<string, unknown>;
  const mode = String(reply.mode || "LISTEN") as ReplyMode;
  const stage = String(data.stage || "expression") as EmotionStage;
  const interaction = String(reply.interaction || "text") as InteractionKind;
  const risk = Math.min(3, Math.max(0, Number(data.risk_level) || 0));
  const text =
    String(reply.text || data.reply || "").trim() ||
    (risk >= 2 ? "我先陪着你。这一刻最重要的是你是安全的。" : "我在。你想从哪一句说起？");
  const decisionRaw = String(episode.decision || "continue");
  const decision =
    decisionRaw === "new" ||
    decisionRaw === "pending" ||
    decisionRaw === "reopen" ||
    decisionRaw === "skip" ||
    decisionRaw === "complete"
      ? decisionRaw
      : "continue";

  return {
    risk_level: risk,
    emotion_relevance_score: Number(data.emotion_relevance_score) || 0,
    episode: {
      decision,
      continuity_score: Number(episode.continuity_score) || 0,
      title: String(episode.title || "").trim().slice(0, 16),
      reopenHint: String(episode.reopenHint || "").trim() || undefined,
      independent: Boolean(episode.independent || episode.independent_event),
    },
    state: {
      weather: String(state.weather || "").trim() || undefined,
      stress: state.stress === null || state.stress === undefined ? null : Number(state.stress),
      energy: state.energy === null || state.energy === undefined ? null : Number(state.energy),
    },
    stage: STAGES.includes(stage) ? stage : "expression",
    emotion: {
      primary: asStringList(emotion.primary).slice(0, 5),
      secondary: asStringList(emotion.secondary).slice(0, 5),
      facts: asStringList(emotion.facts).slice(0, 4),
      thoughts: asStringList(emotion.thoughts).slice(0, 4),
      needs: asStringList(emotion.needs).slice(0, 5),
      trigger: String(emotion.trigger || "").trim() || undefined,
      core_touch: String(emotion.core_touch || "").trim() || undefined,
      interpretations: asStringList(emotion.interpretations).slice(0, 3),
    },
    reply: {
      mode: REPLY_MODES.includes(mode) ? mode : "LISTEN",
      goal: String(reply.goal || "").trim(),
      ask_question: Boolean(reply.ask_question),
      interaction:
        interaction === "weather" ||
        interaction === "emotions" ||
        interaction === "stress" ||
        interaction === "energy" ||
        interaction === "body" ||
        interaction === "needs" ||
        interaction === "action"
          ? interaction
          : "text",
      options: asStringList(reply.options).slice(0, 8),
      text: risk >= 2 ? `${text}\n\n${safetyResources(region)}` : text,
      reframe_now: Boolean(reply.reframe_now) && risk < 2,
      safety_note: risk >= 1 ? String(reply.safety_note || "").trim() : undefined,
    },
  };
}

export async function replyTurn(input: {
  history: ChatLine[];
  latest: string;
  hasImage: boolean;
  memory?: MemoryPack;
  context?: GuideContext;
}): Promise<GuideTurn> {
  const historyText = input.history.length
    ? input.history
        .slice(-LIMITS.historyTurns)
        .map((line) => `${line.role === "user" ? "我" : "你"}：${clipText(line.text, LIMITS.lineChars)}`)
        .join("\n")
    : "（这是这一段的第一句）";
  const ctx = input.context;
  const known = ctx?.known;
  const highLoad = (ctx?.stress ?? 0) >= 7 && (ctx?.energy ?? 10) <= 3;

  const data = await chatJson(
    [
      {
        role: "system",
        content: COACH_SYSTEM,
      },
      {
        role: "user",
        content: `${formatMemory(input.memory)}

当前段落后台状态：
距上一条用户消息约 ${ctx?.hoursSinceLast ?? 0} 小时；pending 观察 ${ctx?.pendingStreak ?? 0} 轮；已连续提问 ${ctx?.askedStreak ?? 0} 轮；阶段 ${ctx?.stage || "未知"}；天气 ${ctx?.weather || "未知"}；压力 ${ctx?.stress ?? "未知"}；能量 ${ctx?.energy ?? "未知"}；高压低能 ${highLoad ? "是" : "否"}。
已掌握事实：${known?.facts.join(" / ") || "无"}
已掌握情绪：${known?.emotions.join(" / ") || "无"}
已掌握想法：${known?.thoughts.join(" / ") || "无"}
已掌握需要：${known?.needs.join(" / ") || "无"}
${coachTurnHint({ askedStreak: ctx?.askedStreak || 0, latest: input.latest, highLoad })}

这一段目前的对话：
${wrapUntrusted("本段对话", historyText)}

用户刚发${input.hasImage ? "（还附了一张图，你看不到图）" : ""}：
${wrapUntrusted("本轮原话", input.latest || "（只有图）")}`,
      },
    ],
    0.45,
  );

  const turn = parseGuideTurn(data, ctx?.region);
  const shortAck = isShortAck(input.latest);
  if (shortAck && (ctx?.askedStreak || 0) >= 1) {
    turn.reply.ask_question = false;
    turn.reply.interaction = "text";
    turn.reply.options = [];
  }
  if (highLoad && turn.risk_level < 2) {
    if (turn.reply.mode === "REFRAME" || turn.reply.mode === "EXPLORE_PATTERN") {
      turn.reply.mode = "LISTEN";
      turn.reply.reframe_now = false;
    }
  }
  if (turn.risk_level >= 2) {
    turn.reply.mode = "SAFETY_SUPPORT";
    turn.reply.interaction = "text";
    turn.reply.options = [];
    turn.reply.reframe_now = false;
    turn.episode.decision = "continue";
  }
  const hadTalk = input.history.some((line) => line.role === "user" && line.text.trim());
  if (hadTalk && wantsCloseEpisode(input.latest)) {
    turn.episode.decision = "complete";
    turn.reply.ask_question = false;
    turn.reply.interaction = "text";
    turn.reply.options = [];
    turn.reply.reframe_now = false;
    if (turn.reply.mode !== "SAFETY_SUPPORT") turn.reply.mode = "INTEGRATE";
  }
  return turn;
}

export async function analyzeSession(lines: TranscriptLine[]): Promise<Analysis> {
  const data = await chatJson(
    [
      {
        role: "system",
        content: `你在为「我」整理这一段的深度洞察。用第一人称「我」写，像我事后看清自己。

禁止：用「用户」「他/她」「TA」指代我；不要写成对「你」的教练点评或建议清单；不要诊断、鸡汤、替我下定论。不确定就写「我好像…」「我还说不清」。

按这个顺序回答，每条 1-4 句，只根据对话里我说的话。只输出 JSON：
{
  "title": "不超过10字，只概括这一段我自己的事",
  "originalEmotion": "原始情绪：我一开始带着什么情绪",
  "emotions": ["具体情绪词"],
  "facts": "发生了什么：尽量客观，仍用「我」",
  "felt": "我感受到了什么：情绪和身体",
  "coreTouch": "我为什么会被触动",
  "needs": "我真正需要什么",
  "pattern": "这是否是我的一个重复模式；不确定就说明不确定，可空",
  "reframe": "我还能如何理解这件事",
  "treatSelf": "我想如何对待自己",
  "weatherFrom": "晴|多云|阴|雨|雾|风|雷暴|风暴",
  "weatherTo": "",
  "stressFrom": null,
  "stressTo": null,
  "energyFrom": null,
  "energyTo": null,
  "suggestedMood": "happy | calm | sad | angry | anxious | tired 之一"
}
emotions 2-4 个。suggestedMood 只能是 ${MOOD_IDS}。pattern 不要写成「我就是低自尊/童年创伤/依恋问题」。`,
      },
      {
        role: "user",
        content: wrapUntrusted(
          "本段记录",
          lines
            .slice(-LIMITS.analyzeLines)
            .map((line) => `${line.time} ${line.role === "user" ? "我" : "听"}：${clipText(line.text, LIMITS.lineChars)}`)
            .join("\n"),
        ),
      },
    ],
    0.35,
  );

  const emotions = Array.isArray(data.emotions)
    ? data.emotions.map(String).filter(Boolean).slice(0, 5)
    : [];
  const suggested = String(data.suggestedMood || "") as MoodId;
  const valid = MOODS.some((m) => m.id === suggested);

  return {
    facts: String(data.facts || "").trim() || "这一段我还没有足够的事实可以整理。",
    emotions,
    needs: String(data.needs || "").trim(),
    insight: String(data.reframe || data.insight || "").trim(),
    thoughts: String(data.thoughts || "").trim() || undefined,
    coreTouch: String(data.coreTouch || "").trim() || undefined,
    title: String(data.title || "").trim().slice(0, 16) || undefined,
    body: String(data.body || "").trim() || undefined,
    felt: String(data.felt || "").trim() || undefined,
    originalEmotion: String(data.originalEmotion || "").trim() || undefined,
    pattern: String(data.pattern || "").trim() || undefined,
    seen: String(data.seen || "").trim() || undefined,
    treatSelf: String(data.treatSelf || "").trim() || undefined,
    reframe: String(data.reframe || data.insight || "").trim() || undefined,
    weatherFrom: String(data.weatherFrom || "").trim() || undefined,
    weatherTo: String(data.weatherTo || "").trim() || undefined,
    stressFrom: data.stressFrom == null ? null : Number(data.stressFrom),
    stressTo: data.stressTo == null ? null : Number(data.stressTo),
    energyFrom: data.energyFrom == null ? null : Number(data.energyFrom),
    energyTo: data.energyTo == null ? null : Number(data.energyTo),
    suggestedMood: valid ? suggested : undefined,
  };
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function analyzePeriod(
  kind: PeriodKind,
  label: string,
  entries: PeriodPayloadEntry[],
  digest: string,
): Promise<Omit<PeriodReport, "id" | "kind" | "label" | "generatedAt">> {
  const rangeName = kind === "week" ? "本周" : kind === "month" ? "本月" : "近90天";
  const data = await chatJson(
    [
      {
        role: "system",
        content: `你在帮「我」从一段时间的情绪记录里看见长期规律。用第一人称「我」写。
禁止：用「用户」「他/她」；不要诊断、鸡汤、打气口号；不要编造次数，次数以本地统计为准。
不是报表，是看见→理解→发现→改变。只输出 JSON：
{
  "highFrequency": [{"name": "情绪词", "count": 3}],
  "panorama": "这段日子我过得怎么样，4-7句，点出构成、强度、好坏比例、相较上一段的变化",
  "topNote": "一句洞察：我最近最常被什么困扰，不要只重复排名",
  "trendNote": "我的状态在变好还是变差，点出时间（如晚上21点后）",
  "rhythms": {
    "time": "时间规律，一句",
    "weekday": "星期规律，一句",
    "scene": "场景规律，一句",
    "people": "人际规律，一句，没有就空",
    "event": "事件规律，一句"
  },
  "triggers": [{"name": "触发器短名", "count": 3, "chain": "常伴随的情绪→想法→行为", "scenes": "常见场景", "behaviors": "常见行为"}],
  "loop": {"title": "循环短名", "steps": ["事件", "情绪", "想法", "行为", "结果", "又回到…"]},
  "unseen": [{"title": "短标题", "body": "我可能没注意到的规律，2-4句"}],
  "growth": [{"name": "焦虑", "delta": -18}],
  "growthNote": "我正在发生什么变化，觉察有没有更深，2-4句",
  "patterns": "规律总述，可空",
  "insight": "一个被忽视的洞见，可空",
  "encouragement": "一句安静收束，不要口号"
}
highFrequency 3-5 个。triggers 3-6 个。unseen 恰好 3 条。loop.steps 5-8 步。growth 的 delta 是百分比整数，负数表示下降。没有依据就留空字符串，不要编。`,
      },
      {
        role: "user",
        content: wrapUntrusted(
          "阶段记录",
          `范围：${rangeName}（${clipText(label, 48)}）
本地统计：${clipText(digest, LIMITS.digestChars) || "无"}
记录：
${
  entries.length
    ? entries
        .slice(-LIMITS.periodEntries)
        .map(
          (e) =>
            `- ${e.day} ${e.weekday || ""} ${e.time} 情绪:${(e.emotions || []).join("/") || "无"} 触动:${clipText(e.coreTouch, 80) || "无"} 需要:${clipText(e.needs, 80) || "无"} 内容:${clipText(e.text, 160)}`,
        )
        .join("\n")
    : "（没有记录）"
}`,
        ),
      },
    ],
    0.4,
  );

  const highFrequency = Array.isArray(data.highFrequency)
    ? data.highFrequency
        .map((row) => {
          const item = row as { name?: unknown; count?: unknown };
          return {
            name: String(item.name || "").trim(),
            count: Number(item.count) || 0,
          };
        })
        .filter((row) => row.name)
        .slice(0, 8)
    : [];
  const rhythmsRaw = asRecord(data.rhythms);
  const loopRaw = asRecord(data.loop);
  const triggers = Array.isArray(data.triggers)
    ? data.triggers
        .map((row) => {
          const item = asRecord(row);
          return {
            name: String(item.name || "").trim(),
            count: Number(item.count) || 0,
            chain: String(item.chain || "").trim() || undefined,
            scenes: String(item.scenes || "").trim() || undefined,
            behaviors: String(item.behaviors || "").trim() || undefined,
          };
        })
        .filter((row) => row.name)
        .slice(0, 8)
    : [];
  const unseen = Array.isArray(data.unseen)
    ? data.unseen
        .map((row) => {
          const item = asRecord(row);
          return {
            title: String(item.title || "").trim(),
            body: String(item.body || "").trim(),
          };
        })
        .filter((row) => row.title || row.body)
        .slice(0, 3)
    : [];
  const growth = Array.isArray(data.growth)
    ? data.growth
        .map((row) => {
          const item = asRecord(row);
          return {
            name: String(item.name || "").trim(),
            delta: Number(item.delta) || 0,
          };
        })
        .filter((row) => row.name)
        .slice(0, 8)
    : [];
  const steps = Array.isArray(loopRaw.steps)
    ? loopRaw.steps.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 8)
    : [];

  return {
    highFrequency,
    patterns: String(data.patterns || "").trim(),
    insight: String(data.insight || "").trim(),
    encouragement: String(data.encouragement || "").trim(),
    panorama: String(data.panorama || "").trim() || undefined,
    topNote: String(data.topNote || "").trim() || undefined,
    trendNote: String(data.trendNote || "").trim() || undefined,
    rhythms: {
      time: String(rhythmsRaw.time || "").trim() || undefined,
      weekday: String(rhythmsRaw.weekday || "").trim() || undefined,
      scene: String(rhythmsRaw.scene || "").trim() || undefined,
      people: String(rhythmsRaw.people || "").trim() || undefined,
      event: String(rhythmsRaw.event || "").trim() || undefined,
    },
    triggers,
    loop: String(loopRaw.title || "").trim()
      ? { title: String(loopRaw.title || "").trim(), steps }
      : undefined,
    unseen,
    growth,
    growthNote: String(data.growthNote || "").trim() || undefined,
  };
}
