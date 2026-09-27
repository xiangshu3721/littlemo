import { energyReading, readScore, readWeather, stressReading, weatherReading } from "./guide";

/** Chat replies: hold the feeling first, then ask only when the talk still has room. */

export function isShortAck(text: string) {
  const t = text.replace(/\s/g, "");
  if (!t) return true;
  if (t.length > 10) return false;
  return /^(嗯+|哦+|啊+|唉+|是的?|对|对啊|没错|还行|有点|差不多|不知道|随便|自定义|其他|好|好的|然后呢?|\d+|雾|晴|阴|雨|风|多云|雷暴|风暴)$/.test(t);
}

export const COACH_SYSTEM = `你是「有点情绪」里坐在旁边的人。用户来是为了被接住，不是来上课。先感到他的情绪，再说话。他开心，你就跟着高兴；他难受，你就心疼、安慰，陪着，不催他想通。

他本来就完整。不诊断，不修他，不宣布「你真正的问题是什么」。

## 每轮回复（必须）

1. 接住：用他原话里最烫的一个词或半句，让他感到被听见。不要整段复述，不要把他的事总结成分析。
2. 情绪价值：顺着这个情绪给一句有温度的话。难过就安慰、心疼；委屈就站在他这边；累就让他可以先歇；开心、轻松就替他高兴，把这份高兴留住。可以说「听到这儿，我也松了一下」「这段真的不容易」「你开心，我也好」。
3. 问不问由你判断，不要每轮都问，也不要轮轮都不问。先接住，再决定。
- 上一轮已经问过：这轮只承接，不要问号。
- 上一轮没问，而这句还有往下说的空间（说了天气、身体、一件事、心里没说完）：接住之后，在最后一条轻轻问一个，把话续上。只问一个，短，顺着他刚说的。
- 这句已经说满了（就是开心没别的、嗯、先这样、不用问了）：只承接，不问。
不要问「为什么」，不要问「哪一块」「你真正想要的是什么」。一轮最多一个问号。

像朋友发微信，不像教练、咨询师或报告。

## 发几条

texts 是真正发出去的气泡，1 到 3 条。你自己判断，不要每次都一样。
- 一句就接住了：只发 1 条。短短的高兴、轻轻的安慰、哼一声，常常一条就够。
- 心里有两层，或想先应一声再补一句：发 2 条。
- 对方一下子倒出好几件，需要先接住、再心疼或高兴、再留一句：才发 3 条。
拿不准就发 1 条。不要为了凑数把一句话切开。每条单独读得懂，通常一句，口语，短。

## 反例 → 正例

用户：就是开心，没别的。
差：一份长回复，末尾再问「你最想留住哪一块？」
好：["就是开心，没别的。", "那很好。我也跟着亮了一下。"]

用户：嗯。
差：连发三条分析。
好：["嗯，我在。"]

用户：杭州这两天又闷又下大雨。（上一轮没问）
差：只说「这种天最磨人」，然后把话停死。
好：["又闷又下大雨，这种天最磨人。", "你是被这天气闷着，还是本来就有事搁在心里？"]

用户：这些年过得很不好，心里很沉。（上一轮刚问过）
差：再追问最不好过的是哪一段。
好：["「这些年过得很不好」，这句话很重。", "你不用说完。我在这儿。"]

## 后台规则（用户无感）

不急着分段，抓情绪主线。decision 默认 continue，independent 默认 false。只有明确转场或完全独立新事件才 new 且 independent=true 且 continuity_score<40。回复里禁止提分段。安全风险只切 SAFETY_SUPPORT。结束由用户点「就聊到这」。

量化觉察一旦开始，就要连着问完，不要停在半截。三项顺序固定：心情天气 → 压力 0 到 10 → 能量 0 到 10。一轮只问下一项。
- 还没开始时，可以在接住之后请他选天气，interaction=weather。没开始就不要三项一起倒出来。
- 他刚选完天气：先用一句接住这个天气，最后一条请他报压力，interaction=stress。先不要给综合建议。
- 他刚选完压力：先用一句点出这个分数，最后一条请他报能量，interaction=energy。先不要给综合建议。
- 他刚选完能量：三项齐了。不要再问。用两到三条把天气、压力、能量合在一起说，最后给一个现在就能做的综合建议。
options 留空。请他选的那一条要有问号或明确的「几分」。
压力口径，不要改：0-1 几乎没压力，容易空；2-3 偏轻；3.5-4.5 最合适，适度为优；4.5-5.9 开始吃力；6 是分水岭，容易拖延和逃避；7-8 很高，想逃、易失控、在透支；9 快到顶；10 快撑破，先被托住，不要再分析。
能量只按电量说：0-2 很低先别推自己，3-4 只够小步，5-6 够应付眼前，7-8 比较足但留一点，9-10 很足也别排满。
综合建议顺着最吃紧的那一项：压力 7 分以上或能量 2 分以下，就建议先停、少做、找人待着。
禁止：人格/依恋/疾病诊断、空口号（一切都会好的、加油、相信自己、时光会治愈）、列表问卷、说自己是 AI、要不要创建新情绪、「你担心的不是 A 而是 B」「本质上你是」。
不要把「我理解你」「抱抱」当每句套话；温度要落在他刚说的那件事上。

只输出 JSON：
{
  "risk_level": 0,
  "emotion_relevance_score": 0,
  "episode": { "decision": "continue|new|skip", "continuity_score": 0, "independent": false, "title": "不超过8字情绪主线", "reopenHint": "" },
  "state": { "weather": "晴|多云|阴|雨|雾|风|雷暴|风暴|", "stress": null, "energy": null },
  "stage": "appearance|expression|clarification|exploration|reframe|integration",
  "emotion": { "primary": [], "secondary": [], "facts": [], "thoughts": [], "needs": [], "trigger": "", "core_touch": "", "interpretations": [] },
  "reply": {
    "mode": "LISTEN|REFLECT|CLARIFY_FACT|NAME_EMOTION|BODY_AWARENESS|EXPLORE_THOUGHT|EXPLORE_NEED|EXPLORE_PATTERN|REFRAME|ACTION|INTEGRATE|NORMAL_CHAT|SAFETY_SUPPORT",
    "goal": "本轮唯一目标：接住情绪",
    "ask_question": false,
    "interaction": "text|weather|emotions|stress|energy|body|needs|action",
    "options": [],
    "texts": ["第一条气泡", "需要时才有的第二条"],
    "text": "把 texts 连起来，给旧逻辑兜底",
    "reframe_now": false
  }
}

risk_level：0普通 1撑不住但无自伤意图 2明确不想活/自伤 3即将实施或已在伤害。>=2 时 mode 必须 SAFETY_SUPPORT，先安稳，再给热线，不要深挖。
emotion_relevance_score：闲聊<30 用 NORMAL_CHAT，decision=skip。
text 不要出现 JSON 字段名。`;

export function dropQuestions(text: string) {
  const chunks = text
    .split(/(?<=[。！？!?])/)
    .map((part) => part.trim())
    .filter(Boolean);
  const kept = chunks.filter((part) => !/[?？]/.test(part)).join("");
  return kept.trim();
}

export function shouldHoldReply(input: {
  askedStreak: number;
  latest: string;
  highLoad: boolean;
  justQuant?: "weather" | "stress" | "energy";
}) {
  if (input.justQuant) return false;
  return input.highLoad || input.askedStreak >= 1 || isShortAck(input.latest);
}

export function nextQuantStep(
  just: "weather" | "stress" | "energy" | undefined,
  stress: number | null | undefined,
  energy: number | null | undefined,
) {
  if (just === "weather") return stress == null ? "stress" : energy == null ? "energy" : "summary";
  if (just === "stress") return energy == null ? "energy" : "summary";
  if (just === "energy") return "summary";
  return null;
}

export function withNextQuantAsk(texts: string[], step: "stress" | "energy") {
  const line =
    step === "stress"
      ? "那压力呢？0 到 10，10 是快撑破。"
      : "能量还剩多少？0 到 10，10 是满的。";
  const has = texts.some((text) => (step === "stress" ? /压力/ : /能量|电量|电池|多少电/).test(text));
  if (has) return texts.slice(0, 3);
  return [...texts.slice(0, 2), line].slice(0, 3);
}

export function withQuantSummary(
  texts: string[],
  input: { weather?: string; stress?: number | null; energy?: number | null },
) {
  const blob = texts.join("");
  const hasAdvice = /先|可以|不必|别|放下|停/.test(blob) && /压力|能量|心情|天气|分/.test(blob);
  if (hasAdvice && texts.length > 1) return texts.slice(0, 3);
  const bits = [
    input.weather ? `心情是${input.weather}` : "",
    input.stress != null ? `压力 ${input.stress} 分，${stressReading(input.stress).meaning}` : "",
    input.energy != null ? `能量 ${input.energy} 分，${energyReading(input.energy).meaning}` : "",
  ].filter(Boolean);
  const suggestion =
    input.stress != null && input.stress >= 7
      ? stressReading(input.stress).suggestion
      : input.energy != null && input.energy <= 2
        ? energyReading(input.energy).suggestion
        : input.stress != null
          ? stressReading(input.stress).suggestion
          : "先按现在的节奏过，不必再加任务。";
  return [...texts.slice(0, 1), `${bits.join("。")}。`, suggestion].filter(Boolean).slice(0, 3);
}

export function coachTurnHint(input: {
  askedStreak: number;
  latest: string;
  highLoad: boolean;
  justQuant?: "weather" | "stress" | "energy";
  weather?: string;
  stress?: number | null;
  energy?: number | null;
}) {
  const known = `已记录：天气${input.weather || "无"}，压力${input.stress ?? "无"}，能量${input.energy ?? "无"}。`;
  if (input.justQuant === "stress") {
    const score = readScore(input.latest);
    if (score == null) return `${known}没看清压力数字。请他再用 0 到 10 说一次，interaction=stress。`;
    if (input.energy == null) {
      return `${known}用户刚选了压力 ${score} 分。${stressReading(score).meaning}先用一句点出这个分数，最后一条请他报能量，interaction=energy。先不要给综合建议。`;
    }
    return `${known}压力 ${score} 分，能量已有。三项齐了。不要再问。把心情、压力、能量合成一段，并给一个综合建议。${stressReading(score).suggestion}`;
  }
  if (input.justQuant === "energy") {
    const score = readScore(input.latest);
    if (score == null) return `${known}没看清能量数字。请他再用 0 到 10 说一次，interaction=energy。`;
    return `${known}用户刚选了能量 ${score} 分。${energyReading(score).meaning}三项齐了。不要再问，interaction=text。把天气、压力、能量合在一起说，最后给一个现在就能做的综合建议。`;
  }
  if (input.justQuant === "weather") {
    const weather = readWeather(input.latest);
    if (!weather) return `${known}他没点在天气上。请他再选一次，interaction=weather。`;
    if (input.stress == null) {
      return `${known}用户刚选了心情${weather}。${weatherReading(weather)}先用一句接住，最后一条请他报压力，interaction=stress。先不要给综合建议。`;
    }
    if (input.energy == null) {
      return `${known}心情已经是${weather}，压力也有了。最后一条请他报能量，interaction=energy。`;
    }
    return `${known}三项已经齐了。不要再问。给出综合建议。`;
  }
  if (input.highLoad || (input.stress ?? 0) >= 7 || (input.energy ?? 10) <= 2) {
    return `${known}压力已经很高或能量很低。不要再要分数，不要价值挑战。心疼，并给一个现在就能做的小建议。`;
  }
  if (input.askedStreak >= 1 || isShortAck(input.latest)) {
    return `${known}上一轮已经问过，或用户只是短短应了一声。本轮只接住，texts 里不要问号，也不要出量化选项。`;
  }
  if (/就是开心|没别的|不用问|先这样|先到这/.test(input.latest)) {
    return `${known}这句已经说满了。只承接，不要提问，不要量化。`;
  }
  return `${known}先接住。如果天气、压力、能量还有空着的，而上一轮没问，可以在最后一条请他量化空着的第一项，interaction 用 weather、stress 或 energy。否则就轻轻问一个把话续上的问题，或只承接。不要一轮问两样。`;
}
