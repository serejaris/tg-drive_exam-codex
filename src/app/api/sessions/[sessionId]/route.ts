import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { serializeSession } from "@/lib/sessions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { sessionId } = await context.params;
  const session = await serializeSession(sessionId, user.id);
  if (!session) {
    return jsonError("Session not found", 404);
  }

  return NextResponse.json(session);
}
