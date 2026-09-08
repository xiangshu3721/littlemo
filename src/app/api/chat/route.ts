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
import { replyTurn } from "@/lib/deepseek";
import { LIMITS, clipText } from "@/lib/limits";
import type { ChatLine, GuideContext, MemoryPack } from "@/lib/types";

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;

export async function POST(req: Request) {
  const limited = rateLimit(req, LIMITS.rateChatPerMin);
  if (limited) return limited;
  try {
    const parsed = await readJsonBody<{
      history?: ChatLine[];
      latest?: string;
      hasImage?: boolean;
      memory?: MemoryPack;
      context?: GuideContext;
    }>(req, LIMITS.jsonBodyChat);
    if (!parsed.ok) return parsed.response;
    const latest = clipText(parsed.data.latest, LIMITS.latestChars).trim();
    const hasImage = Boolean(parsed.data.hasImage);
    if (!latest && !hasImage) {
      return NextResponse.json({ error: "先写一点，或附一张图。" }, { status: 400 });
    }
    const turn = await replyTurn({
      history: clipHistory(parsed.data.history),
      latest,
      hasImage,
      memory: clipMemory(parsed.data.memory),
      context: clipGuideContext(parsed.data.context),
    });
    return NextResponse.json({ turn });
  } catch (err) {
    return NextResponse.json({ error: publicError(err, "没接上") }, { status: 500 });
  }
}
