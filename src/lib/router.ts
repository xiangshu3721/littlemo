import type { EpisodeDecision, Session } from "./types";

export function resolveEpisodeAction(input: {
  ai: EpisodeDecision;
  current?: Session;
  lastUserAt?: number;
  now: number;
  hasCurrentUserHistory: boolean;
  pendingStreak: number;
  userClosed?: boolean;
}): { action: "continue" | "new" | "reopen" | "hold" | "close"; pendingStreak: number } {
  const score = Number(input.ai.continuity_score) || 0;
  const decision = input.ai.decision;

  if (!input.current || !input.hasCurrentUserHistory) {
    return { action: "continue", pendingStreak: 0 };
  }

  if (input.userClosed) {
    return { action: "close", pendingStreak: 0 };
  }

  if (decision === "reopen") {
    return { action: "reopen", pendingStreak: 0 };
  }

  if (decision === "new" && input.ai.independent && score < 40) {
    return { action: "new", pendingStreak: 0 };
  }

  return { action: "continue", pendingStreak: 0 };
}
