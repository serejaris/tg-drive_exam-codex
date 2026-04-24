import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { completeSession } from "@/lib/sessions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { sessionId } = await context.params;
  try {
    const result = await completeSession(user.id, sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not complete session", 400);
  }
}
