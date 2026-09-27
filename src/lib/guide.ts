export const WEATHERS = [
  { id: "晴", label: "晴", hint: "轻松、舒展" },
  { id: "多云", label: "多云", hint: "还行，有事挂心" },
  { id: "阴", label: "阴", hint: "闷、提不起劲" },
  { id: "雨", label: "雨", hint: "难过、想哭" },
  { id: "雾", label: "雾", hint: "迷茫、说不清" },
  { id: "风", label: "风", hint: "躁动、静不下来" },
  { id: "雷暴", label: "雷暴", hint: "愤怒、冲突" },
  { id: "风暴", label: "风暴", hint: "快压不住" },
] as const;

export const BODY_PARTS = ["胸口", "喉咙", "胃", "头", "肩颈", "全身"];
export const BODY_FEELS = ["堵", "紧", "沉", "酸", "麻", "发热", "想哭"];
export const ACTIONS = [
  "先照顾自己",
  "表达感受",
  "建立边界",
  "解决事情",
  "寻求支持",
  "暂停决定",
  "暂时什么都不做",
];

export const REPLY_MODES = [
  "LISTEN",
  "REFLECT",
  "CLARIFY_FACT",
  "NAME_EMOTION",
  "BODY_AWARENESS",
  "EXPLORE_THOUGHT",
  "EXPLORE_NEED",
  "EXPLORE_PATTERN",
  "REFRAME",
  "ACTION",
  "INTEGRATE",
  "NORMAL_CHAT",
  "SAFETY_SUPPORT",
] as const;

export type ReplyMode = (typeof REPLY_MODES)[number];

export const STAGES = [
  "appearance",
  "expression",
  "clarification",
  "exploration",
  "reframe",
  "integration",
] as const;

export type EmotionStage = (typeof STAGES)[number];

export type InteractionKind =
  | "text"
  | "weather"
  | "emotions"
  | "stress"
  | "energy"
  | "body"
  | "needs"
  | "action";

export function hoursBetween(from: number, to: number) {
  return Math.max(0, (to - from) / 36e5);
}

export const WEATHER_MARK: Record<string, string> = {
  晴: "☀️",
  多云: "🌤",
  阴: "☁️",
  雨: "🌧",
  雾: "🌫",
  风: "🌬",
  雷暴: "⛈",
  风暴: "🌪",
};

export function weatherMark(name?: string) {
  if (!name) return "";
  return WEATHER_MARK[name] || name;
}

export const SCORE_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

export function readScore(text: string) {
  const t = text.replace(/\s/g, "");
  const matched = t.match(/^(?:压力|能量)?(\d{1,2})(?:分)?$/);
  if (!matched) return null;
  const score = Number(matched[1]);
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;
  return score;
}

export function readWeather(text: string) {
  const t = text.replace(/\s/g, "");
  return ["雷暴", "风暴", "多云", "晴", "阴", "雨", "雾", "风"].find((name) => t === name || t.startsWith(name));
}

export function stressReading(score: number) {
  if (score <= 1) {
    return {
      meaning: "几乎没有压力。事情不压人，但也容易空、无聊，意义感不够。",
      suggestion: "不必硬找压力。可以找一件很小、今天就做得完的事，让这一天有个落点。",
    };
  }
  if (score < 3.5) {
    return {
      meaning: "压力偏轻，还没到最顺手的那段。人比较松，事情也不算推着你走。",
      suggestion: "如果觉得空，就只推进一件小事，不用把自己填满。",
    };
  }
  if (score <= 4.5) {
    return {
      meaning: "这是比较合适的压力。脑子往往更清醒，做事也更顺。适度就是好。",
      suggestion: "就停在这个力度上，先别再往上加任务。",
    };
  }
  if (score < 6) {
    return {
      meaning: "已经过了最舒服的那段，身心会开始觉得累、费劲。",
      suggestion: "今天少做一件。先把最要紧的留下，其余往后放。",
    };
  }
  if (score < 7) {
    return {
      meaning: "6 分是个坎。人容易开始躲，拖延，或者绕开问题。",
      suggestion: "先别逼自己冲刺。把想逃的那件事缩成十分钟，或者明确今天不做。",
    };
  }
  if (score < 9) {
    return {
      meaning: "压力很高。人会想逃，情绪也容易一下子上来，身体在透支。",
      suggestion: "先离开让你失控的场合。喝口水，今天的大事先不做。",
    };
  }
  if (score < 10) {
    return {
      meaning: "已经离撑破很近。",
      suggestion: "先停。找一个信得过的人待着，今天只碰非做不可的一件。",
    };
  }
  return {
    meaning: "10 分是快撑破的时候。现在要的是被托住，不是再分析。",
    suggestion: "不要做决定，也不要一个人硬扛。去找身边的人，或把眼前的事放下，先安全地停下来。",
  };
}

export function energyReading(score: number) {
  if (score <= 2) {
    return {
      meaning: "电量很低。",
      suggestion: "先别推动自己。休息、吃点东西、少说话，都算在照顾这块电池。",
    };
  }
  if (score <= 4) {
    return {
      meaning: "还有一点电，只够小步。",
      suggestion: "只做一件最小的事，做完就停。",
    };
  }
  if (score <= 6) {
    return {
      meaning: "中等电量，够应付眼前的事。",
      suggestion: "按平常的节奏就好，不必额外加码。",
    };
  }
  if (score <= 8) {
    return {
      meaning: "电量比较足。",
      suggestion: "可以做一点想做的，但留一点，别一次用完。",
    };
  }
  return {
    meaning: "电量很足。",
    suggestion: "趁手可以动一动，同时别把今天排满，免得一下子透支。",
  };
}

export function weatherReading(name: string) {
  const hint = WEATHERS.find((item) => item.id === name)?.hint;
  if (!hint) return "";
  return `这种天气更接近：${hint}。`;
}

export function isArchiveMark(text: string) {
  const t = text.replace(/\s/g, "");
  return /这段先收到这儿|深度洞察会放进|已收进情绪日记|已收进日历/.test(t);
}

export function wantsCloseEpisode(text: string) {
  const t = text.replace(/\s/g, "");
  if (!t) return false;
  if (t.length <= 16 && /结束(吧|了|好了)?$/.test(t)) return true;
  if (/就聊到这/.test(t)) return true;
  if (/^(先这样|先到这[儿里]?[了吧]?|到此为止|不聊了|今天就这样|就到这[儿里]?)/.test(t)) return true;
  if (/收进日历|记下(这段|来)|没有记录|日历里/.test(t)) return true;
  return false;
}

export function safetyResources(region?: string) {
  const where = region?.trim() ? `（你资料里写的是${region}）` : "";
  return `如果你现在不安全，请不要一个人扛。可以马上联系身边信得过的人，或打当地急救 120 / 报警 110。心理援助热线可试 12356${where}。`;
}
