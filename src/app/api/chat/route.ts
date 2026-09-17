import { prisma, type ChatMessage, type Note } from "@littlemo/db";
import { NextResponse } from "next/server";
import {
  clipGuideContext,
  clipHistory,
  clipMemory,
  methodNotAllowed,
  publicError,
  rateLimit,
  readJsonBody,
} from "@/lib/api-guard";
import { chat as gatewayChat } from "@/lib/ai-gateway";
import { readBearer, requireUser } from "@/lib/auth";
import { COMPANION_SYSTEM, ensureCrisisCopy, toGatewayHistory } from "@/lib/companion";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { asClientId, ensureOwnedSession } from "@/lib/diary-cloud";
import { replyTurn } from "@/lib/deepseek";
import { LIMITS, clipText } from "@/lib/limits";
import type { ChatLine, GuideContext, MemoryPack } from "@/lib/types";
import { toDay } from "@/lib/dates";
import { assertUserTextSafe } from "@/lib/wechat-sec";

export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS(req: Request) {
  return preflight(req);
}

function messageJson(row: ChatMessage) {
  return {
    id: row.clientId || row.id,
    dbId: row.id,
    role: row.role,
    content: row.content,
    model: row.model,
    sessionId: row.sessionId,
    clientId: row.clientId,
    createdAt: row.createdAt.toISOString(),
  };
}

function noteJson(note: Note) {
  return {
    id: note.id,
    content: note.content,
    clientId: note.clientId,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    deletedAt: note.deletedAt ? note.deletedAt.toISOString() : null,
  };
}

function isWebCoachPayload(data: {
  latest?: unknown;
  history?: unknown;
  hasImage?: unknown;
  memory?: unknown;
  context?: unknown;
}) {
  return (
    data.latest != null ||
    data.history != null ||
    data.hasImage != null ||
    data.memory != null ||
    data.context != null
  );
}

function latestFromMini(data: {
  content?: unknown;
  messages?: { role?: string; content?: unknown }[];
}) {
  const direct = clipText(data.content, LIMITS.latestChars).trim();
  if (direct) return direct;
  const messages = Array.isArray(data.messages) ? data.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const row = messages[i];
    if (row?.role === "assistant") continue;
    const text = clipText(row?.content, LIMITS.latestChars).trim();
    if (text) return text;
  }
  return "";
}

export async function GET(req: Request) {
  if (!readBearer(req)) return methodNotAllowed();
  const limited = rateLimit(req, LIMITS.rateChatPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return apiJson(req, { messages: messages.map(messageJson) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "对话读不出来") }, 500);
  }
}

async function companionPost(
  req: Request,
  data: {
    content?: unknown;
    messages?: { role?: string; content?: unknown }[];
    clientId?: unknown;
    hasImage?: unknown;
    sessionId?: unknown;
  },
) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const spoken = latestFromMini(data);
    const hasImage = Boolean(data.hasImage);
    if (!spoken && !hasImage) {
      return apiJson(req, { error: "先写一点，或附一张图。" }, 400);
    }
    const content = spoken || "（图片）";
    if (spoken) await assertUserTextSafe({ openid: auth.user.openid, content: spoken, scene: 2 });
    const clientId = asClientId(data.clientId) || null;
    const sessionId = asClientId(data.sessionId);
    const now = new Date();

    if (sessionId) {
      await ensureOwnedSession(auth.user.id, sessionId, {
        day: toDay(now),
        title: content.slice(0, 18),
        lastUserAt: now,
        startedAt: now,
      });
    }

    let note: Note;
    if (clientId) {
      const existing = await prisma.note.findUnique({
        where: { userId_clientId: { userId: auth.user.id, clientId } },
      });
      note = existing
        ? await prisma.note.update({
            where: { id: existing.id },
            data: { content, deletedAt: null },
          })
        : await prisma.note.create({
            data: { userId: auth.user.id, content, clientId },
          });
    } else {
      note = await prisma.note.create({
        data: { userId: auth.user.id, content },
      });
    }

    let userMessage: ChatMessage | null = clientId
      ? await prisma.chatMessage.findUnique({
          where: { userId_clientId: { userId: auth.user.id, clientId } },
        })
      : null;
    if (userMessage) {
      userMessage = await prisma.chatMessage.update({
        where: { id: userMessage.id },
        data: { content, sessionId: sessionId || userMessage.sessionId },
      });
    } else {
      userMessage = await prisma.chatMessage.create({
        data: {
          userId: auth.user.id,
          role: "user",
          content,
          sessionId: sessionId || null,
          clientId,
        },
      });
    }

    const history = await prisma.chatMessage.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "asc" },
    });

    const result = await gatewayChat({
      provider: "deepseek",
      temperature: 0.55,
      messages: [
        { role: "system", content: COMPANION_SYSTEM },
        ...toGatewayHistory(history, content, { hasImage }),
      ],
    });

    const replyText = ensureCrisisCopy(spoken, result.content);
    const assistant = await prisma.chatMessage.create({
      data: {
        userId: auth.user.id,
        role: "assistant",
        content: replyText,
        model: result.model,
        sessionId: sessionId || null,
      },
    });

    return apiJson(req, {
      reply: messageJson(assistant),
      note: noteJson(note),
      sessionId: sessionId || null,
      messages: [messageJson(userMessage), messageJson(assistant)],
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SESSION_TAKEN") {
      return apiJson(req, { error: "段落冲突。" }, 409);
    }
    if (err instanceof Error && err.message === "CONTENT_BLOCKED") {
      return apiJson(req, { error: publicError(err, "这句话过不了内容安全检查，换一种说法。") }, 400);
    }
    return apiJson(req, { error: publicError(err, "没接上") }, 500);
  }
}

async function webCoachPost(data: {
  history?: ChatLine[];
  latest?: string;
  hasImage?: boolean;
  memory?: MemoryPack;
  context?: GuideContext;
}) {
  try {
    const latest = clipText(data.latest, LIMITS.latestChars).trim();
    const hasImage = Boolean(data.hasImage);
    if (!latest && !hasImage) {
      return NextResponse.json({ error: "先写一点，或附一张图。" }, { status: 400 });
    }
    const turn = await replyTurn({
      history: clipHistory(data.history),
      latest,
      hasImage,
      memory: clipMemory(data.memory),
      context: clipGuideContext(data.context),
    });
    return NextResponse.json({ turn });
  } catch (err) {
    return NextResponse.json({ error: publicError(err, "没接上") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateChatPerMin);
  if (limited) return readBearer(req) ? withCors(req, limited) : limited;
  const authed = Boolean(readBearer(req));
  try {
    const parsed = await readJsonBody<{
      history?: ChatLine[];
      latest?: string;
      hasImage?: boolean;
      memory?: MemoryPack;
      context?: GuideContext;
      content?: string;
      messages?: { role?: string; content?: unknown }[];
      clientId?: string;
      sessionId?: string;
    }>(req, LIMITS.jsonBodyChat);
    if (!parsed.ok) {
      return authed ? withCors(req, parsed.response) : parsed.response;
    }

    if (authed || !isWebCoachPayload(parsed.data)) {
      return companionPost(req, parsed.data);
    }
    return webCoachPost(parsed.data);
  } catch (err) {
    const res = NextResponse.json({ error: publicError(err, "没接上") }, { status: 500 });
    return authed ? withCors(req, res) : res;
  }
}
