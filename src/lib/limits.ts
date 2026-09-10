export const LIMITS = {
  latestChars: 4000,
  lineChars: 800,
  historyTurns: 40,
  analyzeLines: 80,
  periodEntries: 60,
  digestChars: 4000,
  memoryChars: 8000,
  quoteChars: 160,
  nickname: 24,
  gender: 16,
  region: 40,
  signature: 140,
  birthday: 16,
  avatarDataUrl: 400_000,
  imageInputBytes: 8 * 1024 * 1024,
  imageOutputBytes: 1_200_000,
  jsonBodyChat: 220_000,
  jsonBodyAnalyze: 180_000,
  jsonBodyPeriod: 180_000,
  jsonBodyAuth: 4_096,
  jsonBodyNotes: 24_000,
  jsonBodyMe: 410_000,
  rateChatPerMin: 24,
  rateAnalyzePerMin: 8,
  ratePeriodPerMin: 6,
  rateAuthPerMin: 20,
  rateNotesPerMin: 40,
} as const;

export function clipText(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .slice(0, max);
}

export function clipStringList(value: unknown, maxItems: number, maxChars: number) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => clipText(item, maxChars))
    .filter(Boolean);
}

export function isSafeImageDataUrl(value?: string) {
  if (!value) return false;
  if (value.length > LIMITS.avatarDataUrl) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(value);
}
