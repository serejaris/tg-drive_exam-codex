import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { answerQuestion } from "@/lib/sessions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const body = (await request.json().catch(() => null)) as {
    question_id?: string;
    selected_option_ids?: string[];
  } | null;
  if (!body?.question_id || !Array.isArray(body.selected_option_ids) || body.selected_option_ids.length === 0) {
    return jsonError("question_id and selected_option_ids are required", 400);
  }

  const { sessionId } = await context.params;
  try {
    const result = await answerQuestion(user.id, sessionId, body.question_id, body.selected_option_ids);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not answer question", 400);
  }
}
