"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  deleteMessage,
  deleteSessionForever,
  getReport,
  listMessages,
  listSessions,
  migrateLegacyEntries,
  putMessage,
  putReport,
  putSession,
} from "@/lib/db";
import { formatClock, today } from "@/lib/dates";
import { hoursBetween, isArchiveMark, wantsCloseEpisode } from "@/lib/guide";
import { LIMITS, clipText, isSafeImageDataUrl } from "@/lib/limits";
import { resolveEpisodeAction } from "@/lib/router";
import type {
  Analysis,
  GuideContext,
  GuideTurn,
  MemoryPack,
  Message,
  MoodId,
  PeriodReport,
  Profile,
  Session,
} from "@/lib/types";

const PROFILE_KEY = "littlemo.profile";

const defaultProfile: Profile = {
  nickname: "阿布",
  gender: "",
  birthday: "",
  region: "",
  signature: "",
};

type Store = {
  ready: boolean;
  messages: Message[];
  liveMessages: Message[];
  sessions: Session[];
  liveSessions: Session[];
  trashSessions: Session[];
  profile: Profile;
  saveProfile: (next: Profile) => void;
  addTurn: (input: { text: string; image?: Blob }) => Promise<void>;
  requestInsight: () => Promise<void>;
  answerChip: (messageId: string, label: string) => Promise<void>;
  retryTurn: (assistantId: string) => Promise<void>;
  updateEpisode: (sessionId: string, patch: Partial<Pick<Session, "title" | "primaryEmotions" | "mood">>) => Promise<void>;
  mergeIntoPrevious: (sessionId: string) => Promise<void>;
  splitLastBeat: (sessionId: string) => Promise<void>;
  setMood: (sessionId: string, mood: MoodId) => Promise<void>;
  retryAnalysis: (sessionId: string) => Promise<void>;
  trash: (sessionId: string) => Promise<void>;
  restore: (sessionId: string) => Promise<void>;
  purge: (sessionId: string) => Promise<void>;
  loadReport: (id: string) => Promise<PeriodReport | undefined>;
  saveReport: (report: PeriodReport) => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function replyPause(startedAt: number, text: string) {
  const elapsed = Date.now() - startedAt;
  const think = 800;
  const type = Math.min(2600, Math.max(900, text.length * 85));
  return Math.max(0, think + type - elapsed);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeProfile(input: Profile): Profile {
  const avatar = isSafeImageDataUrl(input.avatarDataUrl) ? input.avatarDataUrl : undefined;
  return {
    nickname: clipText(input.nickname, LIMITS.nickname).trim() || defaultProfile.nickname,
    gender: clipText(input.gender, LIMITS.gender),
    birthday: clipText(input.birthday, LIMITS.birthday),
    region: clipText(input.region, LIMITS.region),
    signature: clipText(input.signature, LIMITS.signature),
    avatarDataUrl: avatar,
  };
}

function uniq(list: string[]) {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}

function moodFromEmotions(list: string[]): MoodId | undefined {
  const text = list.join(" ");
  if (/怒|气|烦/.test(text)) return "angry";
  if (/焦虑|不安|慌/.test(text)) return "anxious";
  if (/累|疲惫|空/.test(text)) return "tired";
  if (/委屈|难过|失落|想哭/.test(text)) return "sad";
  if (/轻松|开心|舒展/.test(text)) return "happy";
  if (/平静|还好/.test(text)) return "calm";
  return undefined;
}

function mergeGuide(session: Session, turn: GuideTurn, extras: Partial<Session> = {}): Session {
  const primary = uniq([...(session.primaryEmotions || []), ...turn.emotion.primary]);
  return {
    ...session,
    ...extras,
    title: extras.title || session.title,
    stage: turn.stage || session.stage,
    weather: turn.state.weather || session.weather,
    stress: turn.state.stress ?? session.stress,
    energy: turn.state.energy ?? session.energy,
    facts: uniq([...(session.facts || []), ...turn.emotion.facts]),
    triggerEvent: turn.emotion.trigger || session.triggerEvent,
    primaryEmotions: primary,
    secondaryEmotions: uniq([...(session.secondaryEmotions || []), ...turn.emotion.secondary]),
    thoughts: uniq([...(session.thoughts || []), ...turn.emotion.thoughts]),
    coreNeeds: uniq([...(session.coreNeeds || []), ...turn.emotion.needs]),
    coreTheme: turn.emotion.core_touch || session.coreTheme,
    mood: session.mood || moodFromEmotions(primary),
    askedStreak: turn.reply.ask_question ? (session.askedStreak || 0) + 1 : 0,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const messagesRef = useRef<Message[]>([]);
  const sessionsRef = useRef<Session[]>([]);
  const sessionWrite = useRef(Promise.resolve());

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (raw) setProfile(sanitizeProfile({ ...defaultProfile, ...JSON.parse(raw) }));
      } catch {
        /* keep default */
      }
      await migrateLegacyEntries();
      const [msgRows, sessionRows] = await Promise.all([listMessages(), listSessions()]);
      if (!cancelled) {
        messagesRef.current = msgRows;
        sessionsRef.current = sessionRows;
        setMessages(msgRows);
        setSessions(sessionRows);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistMessage = useCallback(async (row: Message) => {
    const i = messagesRef.current.findIndex((m) => m.id === row.id);
    const next =
      i === -1
        ? [...messagesRef.current, row].sort((a, b) => a.createdAt - b.createdAt)
        : messagesRef.current.map((m, idx) => (idx === i ? row : m));
    messagesRef.current = next;
    setMessages(next);
    await putMessage(row);
  }, []);

  const persistSession = useCallback((row: Session) => {
    const run = async () => {
      const prev = sessionsRef.current.find((s) => s.id === row.id);
      const nextRow =
        prev?.endedAt && !row.endedAt && row.status !== "reopened"
          ? { ...row, endedAt: prev.endedAt, status: prev.status || row.status }
          : row;
      const i = sessionsRef.current.findIndex((s) => s.id === nextRow.id);
      const next =
        i === -1
          ? [...sessionsRef.current, nextRow].sort((a, b) => a.startedAt - b.startedAt)
          : sessionsRef.current.map((s, idx) => (idx === i ? nextRow : s));
      sessionsRef.current = next;
      setSessions(next);
      await putSession(nextRow);
    };
    const queued = sessionWrite.current.then(run, run);
    sessionWrite.current = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }, []);

  const userLines = useCallback((sessionId: string) => {
    return messagesRef.current.filter((m) => m.sessionId === sessionId && m.role === "user" && m.text.trim());
  }, []);

  const buildMemory = useCallback((currentSessionId: string): MemoryPack => {
    const live = sessionsRef.current.filter((s) => !s.deletedAt);
    const liveIds = new Set(live.map((s) => s.id));
    const past = live.filter((s) => s.id !== currentSessionId);
    const earlier = messagesRef.current.filter(
      (m) =>
        liveIds.has(m.sessionId) &&
        m.sessionId !== currentSessionId &&
        !m.pending &&
        !m.error &&
        (m.text.trim() || m.image),
    );
    return {
      sessions: past.map((s) => ({
        day: s.day,
        title: s.title || "一段记录",
        facts: s.analysis?.facts,
        emotions: s.analysis?.emotions,
        needs: s.analysis?.needs,
        quotes: earlier
          .filter((m) => m.sessionId === s.id && m.role === "user" && m.text.trim())
          .map((m) => m.text.slice(0, 160))
          .slice(-8),
      })),
      earlierChat: earlier.slice(-100).map((m) => ({
        role: m.role,
        text: (m.text || (m.image ? "（图片）" : "")).slice(0, 240),
        day: m.day,
      })),
    };
  }, []);

  const analyze = useCallback(
    async (sessionId: string) => {
      const session = sessionsRef.current.find((s) => s.id === sessionId);
      if (!session) return;
      const lines = messagesRef.current
        .filter((m) => m.sessionId === sessionId && !m.pending && m.text.trim())
        .map((m) => ({
          role: m.role,
          text: m.text,
          time: formatClock(m.createdAt),
        }));
      if (!lines.some((l) => l.role === "user")) return;
      const start = sessionsRef.current.find((s) => s.id === sessionId) || session;
      await persistSession({ ...start, analysisStatus: "pending", analysisError: undefined });
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines: lines.slice(-LIMITS.analyzeLines).map((l) => ({
              ...l,
              text: clipText(l.text, LIMITS.lineChars),
            })),
          }),
        });
        const data = (await res.json()) as { analysis?: Analysis; error?: string };
        if (!res.ok) throw new Error(data.error || "分析失败");
        const latest = sessionsRef.current.find((s) => s.id === sessionId);
        if (!latest) return;
        await persistSession({
          ...latest,
          analysis: data.analysis,
          analysisStatus: "done",
          title: data.analysis?.title || latest.title,
          mood: latest.mood || data.analysis?.suggestedMood,
          analysisError: undefined,
        });
      } catch (err) {
        const latest = sessionsRef.current.find((s) => s.id === sessionId);
        if (!latest) return;
        await persistSession({
          ...latest,
          analysisStatus: "error",
          analysisError: err instanceof Error ? err.message : "分析失败",
        });
      }
    },
    [persistSession],
  );

  const closeSession = useCallback(
    async (session: Session, status: Session["status"] = "paused") => {
      const latest = sessionsRef.current.find((s) => s.id === session.id) || session;
      if (latest.deletedAt) return;
      const closed: Session = {
        ...latest,
        endedAt: latest.endedAt || Date.now(),
        status,
        analysisStatus: latest.analysisStatus === "done" ? "done" : "pending",
        day: userLines(latest.id).at(-1)?.day || latest.day,
      };
      await persistSession(closed);
      void analyze(latest.id);
    },
    [analyze, persistSession, userLines],
  );

  const splitArchivedTails = useCallback(async () => {
    const snapshot = sessionsRef.current.filter((s) => !s.deletedAt);
    for (const session of snapshot) {
      const thread = messagesRef.current
        .filter((m) => m.sessionId === session.id)
        .sort((a, b) => a.createdAt - b.createdAt);
      const isSeam = (row: Message) =>
        (row.role === "assistant" && isArchiveMark(row.text)) ||
        (row.role === "user" && wantsCloseEpisode(row.text));
      if (!thread.some(isSeam)) continue;
      const parts: Message[][] = [];
      let bucket: Message[] = [];
      for (const row of thread) {
        bucket.push(row);
        if (isSeam(row)) {
          parts.push(bucket);
          bucket = [];
        }
      }
      if (bucket.length) parts.push(bucket);
      if (parts.length < 2) {
        const endAt = thread.find((m) => m.role === "assistant" && isArchiveMark(m.text))?.createdAt;
        if (endAt && !session.endedAt) {
          await persistSession({
            ...session,
            endedAt: endAt,
            status: "completed",
            analysisStatus: session.analysisStatus === "done" ? "done" : "pending",
          });
          if (session.analysisStatus !== "done") void analyze(session.id);
        }
        continue;
      }
      const [first, ...tails] = parts;
      const cutAt = first.at(-1)?.createdAt || session.endedAt || Date.now();
      await persistSession({
        ...session,
        endedAt: session.endedAt || cutAt,
        status: "completed",
        analysisStatus: "pending",
        day: first.filter((m) => m.role === "user").at(-1)?.day || session.day,
      });
      void analyze(session.id);
      for (const tail of tails) {
        const users = tail.filter((m) => m.role === "user" && m.text.trim());
        if (!users.length) continue;
        const start = tail[0];
        const last = tail.at(-1)!;
        const closed = last.role === "assistant" && isArchiveMark(last.text);
        const nextSession: Session = {
          id: nid(),
          day: users.at(-1)?.day || start.day,
          startedAt: start.createdAt,
          endedAt: closed ? last.createdAt : undefined,
          title: users[0].text.replace(/\s+/g, " ").slice(0, 18),
          analysisStatus: closed ? "pending" : "idle",
          status: closed ? "completed" : "active",
          lastUserAt: users.at(-1)?.createdAt,
        };
        await persistSession(nextSession);
        for (const row of tail) {
          await persistMessage({ ...row, sessionId: nextSession.id });
        }
        if (closed) void analyze(nextSession.id);
      }
    }
  }, [analyze, persistMessage, persistSession]);

  const repairedRef = useRef(false);
  useEffect(() => {
    if (!ready || repairedRef.current) return;
    repairedRef.current = true;
    void splitArchivedTails();
  }, [ready, splitArchivedTails]);

  useEffect(() => {
    if (!ready) return;
    for (const row of sessionsRef.current) {
      if (
        row.endedAt &&
        !row.deletedAt &&
        row.analysisStatus === "pending"
      ) {
        void analyze(row.id);
      }
    }
  }, [ready, analyze]);

  const latestTalkSession = useCallback((excludeId?: string) => {
    return [...sessionsRef.current]
      .filter((s) => !s.deletedAt && s.id !== excludeId)
      .map((s) => {
        const users = userLines(s.id);
        const real = users.filter((m) => !wantsCloseEpisode(m.text));
        return { s, users: real, last: real.at(-1)?.createdAt || s.lastUserAt || s.startedAt };
      })
      .filter((row) => row.users.length > 0)
      .sort((a, b) => b.last - a.last)[0];
  }, [userLines]);

  const findReopen = useCallback((hint: string) => {
    const key = hint.trim();
    if (!key) return undefined;
    return [...sessionsRef.current]
      .filter((s) => s.endedAt && !s.deletedAt)
      .reverse()
      .find(
        (s) =>
          s.title.includes(key) ||
          key.includes(s.title) ||
          (s.triggerEvent || "").includes(key) ||
          (s.facts || []).some((f) => f.includes(key)),
      );
  }, []);

  const runTurn = useCallback(
    async (userMsg: Message, history: { role: "user" | "assistant"; text: string }[]) => {
      const pending: Message = {
        id: nid(),
        sessionId: userMsg.sessionId,
        role: "assistant",
        createdAt: Date.now(),
        day: userMsg.day,
        text: "",
        pending: true,
      };
      await persistMessage(pending);
      const startedAt = Date.now();
      const current = sessionsRef.current.find((s) => s.id === userMsg.sessionId);
      const lastUser = messagesRef.current
        .filter((m) => m.sessionId === userMsg.sessionId && m.role === "user" && m.id !== userMsg.id)
        .at(-1);
      const context: GuideContext = {
        hoursSinceLast: lastUser ? hoursBetween(lastUser.createdAt, userMsg.createdAt) : 99,
        pendingStreak: current?.pendingStreak || 0,
        askedStreak: current?.askedStreak || 0,
        stage: current?.stage,
        weather: current?.weather,
        stress: current?.stress,
        energy: current?.energy,
        known: {
          facts: current?.facts || [],
          emotions: [...(current?.primaryEmotions || []), ...(current?.secondaryEmotions || [])],
          thoughts: current?.thoughts || [],
          needs: current?.coreNeeds || [],
        },
        region: profile.region,
      };
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: history.slice(-LIMITS.historyTurns).map((line) => ({
              role: line.role,
              text: clipText(line.text, LIMITS.lineChars),
            })),
            latest: clipText(userMsg.text, LIMITS.latestChars),
            hasImage: Boolean(userMsg.image),
            memory: buildMemory(userMsg.sessionId),
            context,
          }),
        });
        const data = (await res.json()) as { turn?: GuideTurn; error?: string };
        if (!res.ok) throw new Error(data.error || "没接上");
        const turn = data.turn!;
        await wait(replyPause(startedAt, turn.reply.text));
        const live = sessionsRef.current.find((s) => s.id === userMsg.sessionId);
        const hasHistoryHere = Boolean(userLines(userMsg.sessionId).some((m) => m.id !== userMsg.id));
        const userClosed = wantsCloseEpisode(userMsg.text);
        const resolved = resolveEpisodeAction({
          ai: turn.episode,
          current: live,
          lastUserAt: lastUser?.createdAt,
          now: userMsg.createdAt,
          hasCurrentUserHistory: hasHistoryHere,
          pendingStreak: live?.pendingStreak || 0,
          userClosed,
        });

        const replyMsg: Message = {
          ...pending,
          pending: false,
          text: turn.reply.text,
          error: undefined,
          riskLevel: turn.risk_level,
          interaction:
            turn.reply.interaction !== "text" && turn.reply.options.length
              ? { kind: turn.reply.interaction, options: turn.reply.options }
              : undefined,
        };

        const idleChat = turn.episode.decision === "skip" || turn.emotion_relevance_score < 30;

        if (resolved.action === "reopen") {
          const old = findReopen(turn.episode.reopenHint || turn.episode.title);
          if (old && live) {
            const leftoverUsers = userLines(live.id).filter((m) => m.id !== userMsg.id);
            if (leftoverUsers.length) {
              await persistSession({
                ...live,
                endedAt: userMsg.createdAt,
                status: "paused",
                analysisStatus: live.analysisStatus === "done" ? "done" : "idle",
              });
            } else if (live.id !== old.id) {
              await persistSession({ ...live, deletedAt: Date.now(), endedAt: userMsg.createdAt });
            }
            const reopened = mergeGuide(
              { ...old, endedAt: undefined, status: "reopened", lastUserAt: userMsg.createdAt },
              turn,
              { pendingStreak: 0 },
            );
            await persistSession(reopened);
            await persistMessage({ ...userMsg, sessionId: old.id });
            await persistMessage({ ...replyMsg, sessionId: old.id });
            return;
          }
        }

        if (userClosed) {
          const talk = hasHistoryHere ? live : latestTalkSession(live?.id)?.s || live;
          const target = talk && userLines(talk.id).some((m) => m.id !== userMsg.id || talk.id !== live?.id)
            ? talk
            : hasHistoryHere
              ? live
              : undefined;
          if (target) {
            if (live && live.id !== target.id) {
              await persistMessage({ ...userMsg, sessionId: target.id });
              await persistMessage({
                ...replyMsg,
                sessionId: target.id,
                text: /日历|记录/.test(userMsg.text)
                  ? "这段已经收进情绪日记了，你去「情绪日记」里就能看到。"
                  : replyMsg.text,
              });
              if (!userLines(live.id).some((m) => m.id !== userMsg.id)) {
                await persistSession({ ...live, deletedAt: Date.now(), endedAt: Date.now() });
              }
            } else {
              await persistMessage({
                ...replyMsg,
                text: /日历|记录/.test(userMsg.text)
                  ? "这段已经收进情绪日记了，你去「情绪日记」里就能看到。"
                  : replyMsg.text,
              });
            }
            const merged = mergeGuide(target, turn, {
              lastUserAt: userMsg.createdAt,
              pendingStreak: 0,
              status: "completed",
            });
            await closeSession(merged, "completed");
            return;
          }
        }

        if (resolved.action === "new" && live) {
          const users = userLines(live.id);
          const take = Math.min(users.length, Math.max(1, (live.pendingStreak || 0) + 1));
          const cutFrom = users[users.length - take]?.createdAt || userMsg.createdAt;
          const leftoverUsers = users.filter((m) => m.createdAt < cutFrom);
          const nextSession: Session = mergeGuide(
            {
              id: nid(),
              day: userMsg.day,
              startedAt: cutFrom,
              title: turn.episode.title || userMsg.text.slice(0, 8) || "新的一段",
              analysisStatus: "idle",
              status: "active",
              lastUserAt: userMsg.createdAt,
              pendingStreak: 0,
            },
            turn,
          );
          if (leftoverUsers.length) {
            const leftover: Session = {
              ...live,
              endedAt: cutFrom,
              status: "paused",
              pendingStreak: 0,
              lastUserAt: leftoverUsers.at(-1)?.createdAt,
              analysisStatus: live.analysisStatus === "done" ? "done" : "idle",
            };
            await persistSession(leftover);
          } else {
            await persistSession({ ...live, deletedAt: Date.now(), endedAt: cutFrom });
          }
          await persistSession(nextSession);
          const moving = messagesRef.current.filter(
            (m) => m.sessionId === live.id && m.createdAt >= cutFrom,
          );
          for (const row of moving) {
            await persistMessage({ ...row, sessionId: nextSession.id });
          }
          await persistMessage({ ...userMsg, sessionId: nextSession.id });
          await persistMessage({ ...replyMsg, sessionId: nextSession.id });
          return;
        }

        const current = sessionsRef.current.find((s) => s.id === userMsg.sessionId);
        if (current?.endedAt) {
          await persistMessage(replyMsg);
          return;
        }
        if (current) {
          if (idleChat) {
            await persistSession({
              ...current,
              lastUserAt: userMsg.createdAt,
              askedStreak: 0,
              pendingStreak: 0,
              status: "active",
            });
          } else {
            await persistSession(
              mergeGuide(current, turn, {
                status: resolved.action === "hold" ? "pending" : "active",
                pendingStreak: resolved.pendingStreak,
                lastUserAt: userMsg.createdAt,
              }),
            );
          }
        }
        await persistMessage(replyMsg);
      } catch (err) {
        await wait(Math.max(0, 600 - (Date.now() - startedAt)));
        await persistMessage({
          ...pending,
          pending: false,
          text: "",
          error: err instanceof Error ? err.message : "没接上",
        });
      }
    },
    [analyze, persistMessage, persistSession, userLines, buildMemory, profile.region, findReopen, closeSession, latestTalkSession],
  );

  const addTurn = useCallback(
    async (input: { text: string; image?: Blob }) => {
      const now = new Date();
      const day = today();
      await sessionWrite.current;
      let open: Session | undefined = [...sessionsRef.current]
        .filter((s) => !s.endedAt && !s.deletedAt)
        .sort((a, b) => (b.lastUserAt || b.startedAt) - (a.lastUserAt || a.startedAt))[0];
      const lastOf = (id: string) =>
        [...messagesRef.current].filter((m) => m.sessionId === id).at(-1);
      const lastOpen = open ? lastOf(open.id) : undefined;
      if (
        open &&
        lastOpen &&
        ((lastOpen.role === "assistant" && isArchiveMark(lastOpen.text)) ||
          (lastOpen.role === "user" && wantsCloseEpisode(lastOpen.text)))
      ) {
        await closeSession(open, "completed");
        open = undefined;
      }
      if (wantsCloseEpisode(input.text.trim())) {
        const talk = latestTalkSession()?.s;
        if (talk && !talk.endedAt) open = talk;
      }
      if (!open || open.endedAt) {
        open = {
          id: nid(),
          day,
          startedAt: now.getTime(),
          title: input.text.trim().slice(0, 18) || "还在聊的一段",
          analysisStatus: "idle",
          status: "active",
          pendingStreak: 0,
          askedStreak: 0,
        };
        await persistSession(open);
      } else if (!open.title && input.text.trim()) {
        open = { ...open, title: input.text.trim().slice(0, 18), day };
        await persistSession(open);
      }
      const history = messagesRef.current
        .filter((m) => m.sessionId === open!.id && !m.pending && (m.text.trim() || m.role === "user"))
        .map((m) => ({ role: m.role, text: m.text || (m.image ? "（图片）" : "") }));
      const userMsg: Message = {
        id: nid(),
        sessionId: open.id,
        role: "user",
        createdAt: now.getTime(),
        day,
        text: clipText(input.text, LIMITS.latestChars).trim(),
        image: input.image,
      };
      const lastAssist = [...messagesRef.current].reverse().find((m) => m.sessionId === open!.id && m.role === "assistant" && m.interaction && !m.interaction.answered);
      if (lastAssist?.interaction) {
        await persistMessage({
          ...lastAssist,
          interaction: { ...lastAssist.interaction, answered: true },
        });
      }
      await persistMessage(userMsg);
      const closeText = input.text.trim();
      void runTurn(userMsg, history).then(async () => {
        if (!wantsCloseEpisode(closeText)) return;
        const current = sessionsRef.current.find((s) => s.id === userMsg.sessionId);
        const talk = latestTalkSession()?.s;
        const target = current && userLines(current.id).some((m) => !wantsCloseEpisode(m.text))
          ? current
          : talk || current;
        if (target && !target.endedAt) {
          await closeSession(target, "completed");
        } else if (target && target.analysisStatus !== "done") {
          void analyze(target.id);
        }
      });
    },
    [analyze, closeSession, persistMessage, persistSession, runTurn, userLines, latestTalkSession],
  );

  const requestInsight = useCallback(async () => {
    const opens = sessionsRef.current.filter(
      (s) => !s.endedAt && !s.deletedAt && userLines(s.id).some((m) => !wantsCloseEpisode(m.text)),
    );
    const talk = [...opens].sort((a, b) => (b.lastUserAt || b.startedAt) - (a.lastUserAt || a.startedAt))[0];
    if (!talk) return;
    await closeSession(talk, "completed");
  }, [closeSession, userLines]);

  const answerChip = useCallback(
    async (messageId: string, label: string) => {
      const msg = messagesRef.current.find((m) => m.id === messageId);
      if (!msg?.interaction || msg.interaction.answered) return;
      await persistMessage({ ...msg, interaction: { ...msg.interaction, answered: true } });
      await addTurn({ text: label });
    },
    [addTurn, persistMessage],
  );

  const retryTurn = useCallback(
    async (assistantId: string) => {
      const assistant = messagesRef.current.find((m) => m.id === assistantId);
      if (!assistant) return;
      const prior = [...messagesRef.current]
        .filter((m) => m.sessionId === assistant.sessionId && m.createdAt < assistant.createdAt)
        .sort((a, b) => a.createdAt - b.createdAt);
      const userMsg = [...prior].reverse().find((m) => m.role === "user");
      if (!userMsg) return;
      const history = prior
        .filter((m) => m.id !== userMsg.id && !m.pending)
        .map((m) => ({ role: m.role, text: m.text || (m.image ? "（图片）" : "") }));
      await deleteMessage(assistantId);
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== assistantId);
        messagesRef.current = next;
        return next;
      });
      await runTurn(userMsg, history);
    },
    [runTurn],
  );

  const setMood = useCallback(
    async (sessionId: string, mood: MoodId) => {
      const cur = sessionsRef.current.find((s) => s.id === sessionId);
      if (!cur) return;
      await persistSession({ ...cur, mood });
    },
    [persistSession],
  );

  const retryAnalysis = useCallback(
    async (sessionId: string) => {
      await analyze(sessionId);
    },
    [analyze],
  );

  const updateEpisode = useCallback(
    async (sessionId: string, patch: Partial<Pick<Session, "title" | "primaryEmotions" | "mood">>) => {
      const cur = sessionsRef.current.find((s) => s.id === sessionId);
      if (!cur) return;
      const next = { ...cur, ...patch };
      if (patch.primaryEmotions && next.analysis) {
        next.analysis = { ...next.analysis, emotions: patch.primaryEmotions };
      }
      await persistSession(next);
    },
    [persistSession],
  );

  const mergeIntoPrevious = useCallback(
    async (sessionId: string) => {
      const live = sessionsRef.current
        .filter((s) => !s.deletedAt)
        .sort((a, b) => a.startedAt - b.startedAt);
      const idx = live.findIndex((s) => s.id === sessionId);
      if (idx < 1) return;
      const prev = live[idx - 1];
      const cur = live[idx];
      const moving = messagesRef.current.filter((m) => m.sessionId === cur.id);
      for (const row of moving) {
        await persistMessage({ ...row, sessionId: prev.id });
      }
      await persistSession({
        ...prev,
        endedAt: cur.endedAt || prev.endedAt,
        lastUserAt: cur.lastUserAt || prev.lastUserAt,
        title: prev.title || cur.title,
        primaryEmotions: uniq([...(prev.primaryEmotions || []), ...(cur.primaryEmotions || [])]),
        facts: uniq([...(prev.facts || []), ...(cur.facts || [])]),
        thoughts: uniq([...(prev.thoughts || []), ...(cur.thoughts || [])]),
        coreNeeds: uniq([...(prev.coreNeeds || []), ...(cur.coreNeeds || [])]),
        analysisStatus: prev.analysisStatus === "done" && !moving.length ? "done" : "pending",
      });
      await persistSession({ ...cur, deletedAt: Date.now(), endedAt: cur.endedAt || Date.now() });
      void analyze(prev.id);
    },
    [analyze, persistMessage, persistSession],
  );

  const splitLastBeat = useCallback(
    async (sessionId: string) => {
      const cur = sessionsRef.current.find((s) => s.id === sessionId);
      if (!cur) return;
      const users = userLines(sessionId);
      if (users.length < 2) return;
      const last = users.at(-1)!;
      const moving = messagesRef.current.filter((m) => m.sessionId === sessionId && m.createdAt >= last.createdAt);
      const next: Session = {
        id: nid(),
        day: last.day,
        startedAt: last.createdAt,
        endedAt: cur.endedAt,
        title: last.text.slice(0, 8) || "新的一段",
        analysisStatus: "pending",
        status: cur.endedAt ? "paused" : "active",
        lastUserAt: last.createdAt,
      };
      await persistSession({
        ...cur,
        endedAt: last.createdAt,
        status: "paused",
        lastUserAt: users[users.length - 2]?.createdAt,
        analysisStatus: "pending",
      });
      await persistSession(next);
      for (const row of moving) {
        await persistMessage({ ...row, sessionId: next.id });
      }
      void analyze(cur.id);
      void analyze(next.id);
    },
    [analyze, persistMessage, persistSession, userLines],
  );

  const trash = useCallback(
    async (sessionId: string) => {
      const cur = sessionsRef.current.find((s) => s.id === sessionId);
      if (!cur) return;
      await persistSession({ ...cur, deletedAt: Date.now() });
    },
    [persistSession],
  );

  const restore = useCallback(
    async (sessionId: string) => {
      const cur = sessionsRef.current.find((s) => s.id === sessionId);
      if (!cur) return;
      const rest = { ...cur };
      delete rest.deletedAt;
      await persistSession(rest);
    },
    [persistSession],
  );

  const purge = useCallback(async (sessionId: string) => {
    await deleteSessionForever(sessionId);
    sessionsRef.current = sessionsRef.current.filter((s) => s.id !== sessionId);
    messagesRef.current = messagesRef.current.filter((m) => m.sessionId !== sessionId);
    setSessions(sessionsRef.current);
    setMessages(messagesRef.current);
  }, []);

  const saveProfile = useCallback((next: Profile) => {
    const clean = sanitizeProfile(next);
    setProfile(clean);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));
  }, []);

  const loadReport = useCallback((id: string) => getReport(id), []);
  const saveReport = useCallback(async (report: PeriodReport) => {
    await putReport(report);
  }, []);

  const liveSessions = useMemo(
    () => sessions.filter((s) => !s.deletedAt),
    [sessions],
  );
  const liveIds = useMemo(() => new Set(liveSessions.map((s) => s.id)), [liveSessions]);
  const liveMessages = useMemo(
    () => messages.filter((m) => liveIds.has(m.sessionId)),
    [messages, liveIds],
  );
  const trashSessions = useMemo(
    () => sessions.filter((s) => s.deletedAt).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)),
    [sessions],
  );

  const value = useMemo(
    () => ({
      ready,
      messages,
      liveMessages,
      sessions,
      liveSessions,
      trashSessions,
      profile,
      saveProfile,
      addTurn,
      requestInsight,
      answerChip,
      retryTurn,
      setMood,
      retryAnalysis,
      updateEpisode,
      mergeIntoPrevious,
      splitLastBeat,
      trash,
      restore,
      purge,
      loadReport,
      saveReport,
    }),
    [
      ready,
      messages,
      liveMessages,
      sessions,
      liveSessions,
      trashSessions,
      profile,
      saveProfile,
      addTurn,
      requestInsight,
      answerChip,
      retryTurn,
      setMood,
      retryAnalysis,
      updateEpisode,
      mergeIntoPrevious,
      splitLastBeat,
      trash,
      restore,
      purge,
      loadReport,
      saveReport,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("Store missing");
  return ctx;
}
