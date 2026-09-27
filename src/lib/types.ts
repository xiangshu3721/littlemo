import type { EmotionStage, InteractionKind, ReplyMode } from "./guide";

export type MoodId =
  | "happy"
  | "calm"
  | "sad"
  | "angry"
  | "anxious"
  | "tired";

export type Analysis = {
  facts: string;
  emotions: string[];
  needs: string;
  insight: string;
  suggestedMood?: MoodId;
  thoughts?: string;
  coreTouch?: string;
  title?: string;
  reframe?: string;
  body?: string;
  felt?: string;
  originalEmotion?: string;
  pattern?: string;
  seen?: string;
  treatSelf?: string;
  weatherFrom?: string;
  weatherTo?: string;
  stressFrom?: number | null;
  stressTo?: number | null;
  energyFrom?: number | null;
  energyTo?: number | null;
};

export type AnalysisStatus = "idle" | "pending" | "done" | "error";

export type ConsistencyExpression = {
  observation: string;
  feeling: string;
  need: string;
  request: string;
  expression: string;
};

export type ChatRole = "user" | "assistant";

export type EpisodeStatus = "active" | "pending" | "paused" | "completed" | "reopened";

export type MessageInteraction = {
  kind: InteractionKind;
  options: string[];
  answered?: boolean;
};

export type Message = {
  id: string;
  sessionId: string;
  role: ChatRole;
  createdAt: number;
  day: string;
  text: string;
  image?: Blob;
  pending?: boolean;
  error?: string;
  interaction?: MessageInteraction;
  riskLevel?: number;
};

export type Session = {
  id: string;
  day: string;
  startedAt: number;
  endedAt?: number;
  title: string;
  mood?: MoodId;
  analysis?: Analysis | null;
  analysisStatus: AnalysisStatus;
  analysisError?: string;
  expression?: ConsistencyExpression | null;
  expressionStatus?: AnalysisStatus;
  expressionError?: string;
  deletedAt?: number;
  status?: EpisodeStatus;
  stage?: EmotionStage;
  weather?: string;
  stress?: number | null;
  energy?: number | null;
  facts?: string[];
  triggerEvent?: string;
  primaryEmotions?: string[];
  secondaryEmotions?: string[];
  thoughts?: string[];
  coreNeeds?: string[];
  coreTheme?: string;
  bodyFeelings?: string[];
  reframe?: string;
  possibleAction?: string;
  pendingStreak?: number;
  askedStreak?: number;
  lastUserAt?: number;
};

export type Profile = {
  nickname: string;
  gender: string;
  birthday: string;
  region: string;
  signature: string;
  avatarDataUrl?: string;
};

export type PeriodKind = "week" | "month" | "days90";

export type PeriodChange = {
  name: string;
  delta: number;
};

export type PeriodTrigger = {
  name: string;
  count: number;
  chain?: string;
  scenes?: string;
  behaviors?: string;
};

export type PeriodLoop = {
  title: string;
  steps: string[];
};

export type PeriodUnseen = {
  title: string;
  body: string;
};

export type PeriodRhythm = {
  time?: string;
  weekday?: string;
  scene?: string;
  people?: string;
  event?: string;
};

export type PeriodReport = {
  id: string;
  kind: PeriodKind;
  label: string;
  generatedAt: number;
  highFrequency: { name: string; count: number }[];
  patterns: string;
  insight: string;
  encouragement: string;
  panorama?: string;
  topNote?: string;
  trendNote?: string;
  rhythms?: PeriodRhythm;
  triggers?: PeriodTrigger[];
  loop?: PeriodLoop;
  unseen?: PeriodUnseen[];
  growthNote?: string;
  growth?: PeriodChange[];
};

export type PeriodPayloadEntry = {
  day: string;
  time: string;
  text: string;
  mood?: string;
  emotions?: string[];
  weekday?: string;
  hour?: number;
  stress?: number | null;
  energy?: number | null;
  weather?: string;
  coreTouch?: string;
  needs?: string;
  pattern?: string;
};

export type EpisodeDecision = {
  decision: "continue" | "new" | "pending" | "reopen" | "skip" | "complete";
  continuity_score: number;
  title: string;
  reopenHint?: string;
  independent?: boolean;
};

export type GuideTurn = {
  risk_level: number;
  emotion_relevance_score: number;
  episode: EpisodeDecision;
  state: {
    weather?: string;
    stress?: number | null;
    energy?: number | null;
  };
  stage: EmotionStage;
  emotion: {
    primary: string[];
    secondary: string[];
    facts: string[];
    thoughts: string[];
    needs: string[];
    trigger?: string;
    core_touch?: string;
    interpretations?: string[];
  };
  reply: {
    mode: ReplyMode;
    goal: string;
    ask_question: boolean;
    interaction: InteractionKind;
    options: string[];
    text: string;
    texts: string[];
    reframe_now: boolean;
    safety_note?: string;
  };
};

export type TranscriptLine = {
  role: ChatRole;
  text: string;
  time: string;
};

export type MemorySession = {
  day: string;
  title: string;
  facts?: string;
  emotions?: string[];
  needs?: string;
  quotes: string[];
};

export type ChatLine = {
  role: ChatRole;
  text: string;
  day?: string;
};

export type MemoryPack = {
  sessions: MemorySession[];
  earlierChat: ChatLine[];
};

export type GuideContext = {
  hoursSinceLast: number;
  pendingStreak: number;
  askedStreak: number;
  stage?: EmotionStage;
  weather?: string;
  stress?: number | null;
  energy?: number | null;
  justQuant?: "weather" | "stress" | "energy";
  known: {
    facts: string[];
    emotions: string[];
    thoughts: string[];
    needs: string[];
  };
  region?: string;
};
