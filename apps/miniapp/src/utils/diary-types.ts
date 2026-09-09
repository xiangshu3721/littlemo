export type MoodId = "happy" | "calm" | "sad" | "angry" | "anxious" | "tired";

export type AnalysisStatus = "idle" | "pending" | "done" | "error";

export type ChatRole = "user" | "assistant";

export type EpisodeStatus = "active" | "pending" | "paused" | "completed" | "reopened";

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

export type Message = {
  id: string;
  sessionId: string;
  role: ChatRole;
  createdAt: number;
  day: string;
  text: string;
  pending?: boolean;
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
  deletedAt?: number;
  status?: EpisodeStatus;
  weather?: string;
  stress?: number | null;
  energy?: number | null;
  primaryEmotions?: string[];
  thoughts?: string[];
  coreNeeds?: string[];
  coreTheme?: string;
  lastUserAt?: number;
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

export type TranscriptLine = {
  role: ChatRole;
  text: string;
  time: string;
};

export type DiaryBundle = {
  sessions: Session[];
  messages: Message[];
  reports: PeriodReport[];
};
