type SpeechChunk = {
  isFinal: boolean;
  0?: { transcript?: string };
};

type SpeechResultEvent = {
  results: ArrayLike<SpeechChunk>;
};

type SpeechErrorEvent = {
  error?: string;
};

export type SpeechSession = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};

export function createSpeechSession(): SpeechSession | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechSession;
    webkitSpeechRecognition?: new () => SpeechSession;
  };
  const Ctor = host.SpeechRecognition || host.webkitSpeechRecognition;
  if (!Ctor) return null;
  const session = new Ctor();
  session.lang = "zh-CN";
  session.continuous = true;
  session.interimResults = true;
  return session;
}

export function readTranscript(event: SpeechResultEvent) {
  let finalText = "";
  let interim = "";
  for (let i = 0; i < event.results.length; i += 1) {
    const chunk = event.results[i];
    const piece = chunk?.[0]?.transcript ?? "";
    if (chunk?.isFinal) finalText += piece;
    else interim += piece;
  }
  return { finalText, interim, spoken: finalText + interim };
}

export function joinSpeech(base: string, spoken: string) {
  if (!spoken) return base;
  if (!base) return spoken;
  const needsSpace = /[A-Za-z0-9]$/.test(base) && /^[A-Za-z0-9]/.test(spoken);
  return `${base}${needsSpace ? " " : ""}${spoken}`;
}

export function speechErrorMessage(code?: string) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "需要允许麦克风，才能把说的话转成文字。";
    case "audio-capture":
      return "没有找到麦克风。";
    case "network":
      return "语音转文字需要联网。";
    case "no-speech":
      return "没听清，再说一次。";
    case "aborted":
      return "";
    default:
      return "语音没转成文字，可以再试一次。";
  }
}
