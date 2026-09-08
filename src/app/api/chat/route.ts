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
import { replyTurn } from "@/lib/deepseek";
import { LIMITS, clipText } from "@/lib/limits";
import type { ChatLine, GuideContext, MemoryPack } from "@/lib/types";

export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS(req: Request) {
  return preflight(req);
}

function messageJson(row: ChatMessage) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    model: row.model,
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
  },
) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const content = latestFromMini(data);
    if (!content) return apiJson(req, { error: "先写一点。" }, 400);
    const clientId = clipText(data.clientId, 64).trim() || null;

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

    const userMessage = await prisma.chatMessage.create({
      data: { userId: auth.user.id, role: "user", content },
    });

    const history = await prisma.chatMessage.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "asc" },
    });

    const result = await gatewayChat({
      provider: "deepseek",
      temperature: 0.55,
      messages: [
        { role: "system", content: COMPANION_SYSTEM },
        ...toGatewayHistory(history, content),
      ],
    });

    const replyText = ensureCrisisCopy(content, result.content);
    const assistant = await prisma.chatMessage.create({
      data: {
        userId: auth.user.id,
        role: "assistant",
        content: replyText,
        model: result.model,
      },
    });

    return apiJson(req, {
      reply: messageJson(assistant),
      note: noteJson(note),
      messages: [messageJson(userMessage), messageJson(assistant)],
    });
  } catch (err) {
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
