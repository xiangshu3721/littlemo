import { prisma, type Note } from "@littlemo/db";
import { publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { LIMITS, clipText } from "@/lib/limits";

export function OPTIONS(req: Request) {
  return preflight(req);
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

async function readNoteId(req: Request, body?: { id?: unknown }) {
  const url = new URL(req.url);
  return clipText(body?.id ?? url.searchParams.get("id"), 64).trim();
}

export async function GET(req: Request) {
  const limited = rateLimit(req, LIMITS.rateNotesPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const includeDeleted = new URL(req.url).searchParams.get("includeDeleted") === "1";
    const notes = await prisma.note.findMany({
      where: {
        userId: auth.user.id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: "asc" },
    });
    return apiJson(req, { notes: notes.map(noteJson) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "记录读不出来") }, 500);
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateNotesPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const parsed = await readJsonBody<{ content?: string; clientId?: string }>(req, LIMITS.jsonBodyNotes);
    if (!parsed.ok) return withCors(req, parsed.response);
    const content = clipText(parsed.data.content, LIMITS.latestChars).trim();
    const clientId = clipText(parsed.data.clientId, 64).trim() || null;
    if (!content) return apiJson(req, { error: "先写一点。" }, 400);

    if (clientId) {
      const existing = await prisma.note.findUnique({
        where: { userId_clientId: { userId: auth.user.id, clientId } },
      });
      if (existing) {
        if (existing.deletedAt) {
          const restored = await prisma.note.update({
            where: { id: existing.id },
            data: { content, deletedAt: null },
          });
          return apiJson(req, { note: noteJson(restored) });
        }
        return apiJson(req, { note: noteJson(existing) });
      }
    }

    const note = await prisma.note.create({
      data: { userId: auth.user.id, content, clientId },
    });
    return apiJson(req, { note: noteJson(note) }, 201);
  } catch (err) {
    return apiJson(req, { error: publicError(err, "没记下") }, 500);
  }
}

export async function PATCH(req: Request) {
  const limited = rateLimit(req, LIMITS.rateNotesPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const parsed = await readJsonBody<{ id?: string; content?: string }>(req, LIMITS.jsonBodyNotes);
    if (!parsed.ok) return withCors(req, parsed.response);
    const id = await readNoteId(req, parsed.data);
    const content = clipText(parsed.data.content, LIMITS.latestChars).trim();
    if (!id) return apiJson(req, { error: "缺少记录。" }, 400);
    if (!content) return apiJson(req, { error: "先写一点。" }, 400);
    const note = await prisma.note.findFirst({ where: { id, userId: auth.user.id, deletedAt: null } });
    if (!note) return apiJson(req, { error: "找不到这条。" }, 404);
    const updated = await prisma.note.update({ where: { id: note.id }, data: { content } });
    return apiJson(req, { note: noteJson(updated) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "没改成") }, 500);
  }
}

export async function DELETE(req: Request) {
  const limited = rateLimit(req, LIMITS.rateNotesPerMin);
  if (limited) return withCors(req, limited);
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    let id = new URL(req.url).searchParams.get("id") || "";
    if (!id) {
      const parsed = await readJsonBody<{ id?: string }>(req, LIMITS.jsonBodyNotes);
      if (!parsed.ok) return withCors(req, parsed.response);
      id = clipText(parsed.data.id, 64);
    }
    id = clipText(id, 64).trim();
    if (!id) return apiJson(req, { error: "缺少记录。" }, 400);
    const note = await prisma.note.findFirst({ where: { id, userId: auth.user.id, deletedAt: null } });
    if (!note) return apiJson(req, { error: "找不到这条。" }, 404);
    const updated = await prisma.note.update({
      where: { id: note.id },
      data: { deletedAt: new Date() },
    });
    return apiJson(req, { note: noteJson(updated) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "没删掉") }, 500);
  }
}
