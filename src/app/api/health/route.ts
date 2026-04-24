import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "tg-drive-exam",
    version: "0.1.0"
  });
}
