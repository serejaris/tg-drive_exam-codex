import { NextResponse } from "next/server";
import { createBot } from "@/lib/bot";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ secret: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const expectedSecret = process.env.BOT_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return jsonError("BOT_WEBHOOK_SECRET is not configured", 500);
  }

  const { secret } = await context.params;
  if (secret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const update = await request.json();
  const bot = createBot();
  await bot.handleUpdate(update);

  return NextResponse.json({ ok: true });
}
