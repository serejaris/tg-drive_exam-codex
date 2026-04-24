import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";
import { validateTelegramInitData } from "@/lib/telegram";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return jsonError("TELEGRAM_BOT_TOKEN is not configured", 500);
  }

  const body = (await request.json().catch(() => null)) as { initData?: string } | null;
  if (!body?.initData) {
    return jsonError("initData is required", 400);
  }

  const validation = validateTelegramInitData(body.initData, botToken);
  if (!validation.ok) {
    return jsonError(validation.error, 401);
  }

  const user = await prisma.user.upsert({
    where: { telegramUserId: BigInt(validation.user.id) },
    update: {
      username: validation.user.username,
      firstName: validation.user.first_name,
      lastName: validation.user.last_name
    },
    create: {
      telegramUserId: BigInt(validation.user.id),
      username: validation.user.username,
      firstName: validation.user.first_name,
      lastName: validation.user.last_name
    }
  });

  await setSessionCookie(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      telegramUserId: user.telegramUserId.toString(),
      username: user.username,
      firstName: user.firstName
    }
  });
}
