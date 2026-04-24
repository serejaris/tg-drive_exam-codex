import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "tg_exam_session";

type SessionPayload = {
  sub: string;
  iat: number;
};

export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function requireUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) {
    return null;
  }
  return prisma.user.findUnique({ where: { id: payload.sub } });
}

export function createSessionToken(userId: string): string {
  const payload: SessionPayload = { sub: userId, iat: Math.floor(Date.now() / 1000) };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, receivedSignature] = token.split(".");
  if (!encodedPayload || !receivedSignature) {
    return null;
  }
  if (!safeEqual(receivedSignature, sign(encodedPayload))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

function sign(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
