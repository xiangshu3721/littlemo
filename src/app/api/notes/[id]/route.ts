import { prisma } from "@suisuinian/db";
import { publicError, rateLimit, readJsonBody } from "@/lib/api-guard";
import { requireUser } from "@/lib/auth";
import { apiJson, preflight, withCors } from "@/lib/cors";
import { LIMITS, clipText } from "@/lib/limits";

export function OPTIONS(req: Request) {
  return preflight(req);
}

async function loadOwned(req: Request, id: string) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth;
  const note = await prisma.note.findFirst({
    where: { id, userId: auth.user.id, deletedAt: null },
  });
  if (!note) {
    return { ok: false as const, response: apiJson(req, { error: "找不到这条。" }, 404) };
  }
  return { ok: true as const, note };
}

function noteJson(note: { id: string; content: string; clientId: string | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null }) {
  return {
    id: note.id,
    content: note.content,
    clientId: note.clientId,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    deletedAt: note.deletedAt ? note.deletedAt.toISOString() : null,
  };
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const limited = rateLimit(req, LIMITS.rateNotesPerMin);
  if (limited) return withCors(req, limited);
  const { id } = await ctx.params;
  try {
    const loaded = await loadOwned(req, id);
    if (!loaded.ok) return loaded.response;
    const parsed = await readJsonBody<{ content?: string }>(req, LIMITS.jsonBodyNotes);
    if (!parsed.ok) return withCors(req, parsed.response);
    const content = clipText(parsed.data.content, LIMITS.latestChars).trim();
    if (!content) return apiJson(req, { error: "先写一点。" }, 400);
    const updated = await prisma.note.update({ where: { id: loaded.note.id }, data: { content } });
    return apiJson(req, { note: noteJson(updated) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "没改成") }, 500);
  }
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const limited = rateLimit(req, LIMITS.rateNotesPerMin);
  if (limited) return withCors(req, limited);
  const { id } = await ctx.params;
  try {
    const loaded = await loadOwned(req, id);
    if (!loaded.ok) return loaded.response;
    const updated = await prisma.note.update({
      where: { id: loaded.note.id },
      data: { deletedAt: new Date() },
    });
    return apiJson(req, { note: noteJson(updated) });
  } catch (err) {
    return apiJson(req, { error: publicError(err, "没删掉") }, 500);
  }
}
