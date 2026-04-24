import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const [totalAttempts, correctAttempts, completedSessions] = await Promise.all([
    prisma.attempt.count({ where: { userId: user.id } }),
    prisma.attempt.count({ where: { userId: user.id, isCorrect: true } }),
    prisma.quizSession.count({ where: { userId: user.id, status: "completed" } })
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      telegramUserId: user.telegramUserId.toString(),
      username: user.username,
      firstName: user.firstName
    },
    progress: {
      totalAttempts,
      correctAttempts,
      accuracy: totalAttempts === 0 ? 0 : Math.round((correctAttempts / totalAttempts) * 100),
      completedSessions
    }
  });
}
