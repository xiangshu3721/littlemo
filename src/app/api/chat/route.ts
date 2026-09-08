import { NextResponse } from "next/server";
import { replyTurn } from "@/lib/deepseek";
import type { ChatLine, GuideContext, MemoryPack } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      history?: ChatLine[];
      latest?: string;
      hasImage?: boolean;
      memory?: MemoryPack;
      context?: GuideContext;
    };
    const latest = (body.latest || "").trim();
    if (!latest && !body.hasImage) {
      return NextResponse.json({ error: "先写一点，或附一张图。" }, { status: 400 });
    }
    const turn = await replyTurn({
      history: Array.isArray(body.history) ? body.history : [],
      latest,
      hasImage: Boolean(body.hasImage),
      memory: body.memory,
      context: body.context,
    });
    return NextResponse.json({ turn });
  } catch (err) {
    const message = err instanceof Error ? err.message : "没接上";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
