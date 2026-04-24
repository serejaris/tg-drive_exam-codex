import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createQuizSession, type QuizMode } from "@/lib/sessions";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const body = (await request.json().catch(() => null)) as { mode?: string; limit?: number } | null;
  const mode = body?.mode === "exam" ? "exam" : body?.mode === "practice" ? "practice" : null;
  if (!mode) {
    return jsonError("mode must be practice or exam", 400);
  }

  try {
    const session = await createQuizSession(user.id, mode as QuizMode, body?.limit);
    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create session", 500);
  }
}
