import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramInitDataResult =
  | { ok: true; user: TelegramUser; authDate: Date }
  | { ok: false; error: string };

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

export function validateTelegramInitData(initData: string, botToken: string): TelegramInitDataResult {
  if (!initData || !botToken) {
    return { ok: false, error: "Missing initData or bot token" };
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) {
    return { ok: false, error: "Missing hash" };
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!safeEqualHex(receivedHash, calculatedHash)) {
    return { ok: false, error: "Invalid hash" };
  }

  const authDateValue = params.get("auth_date");
  const authDateSeconds = authDateValue ? Number(authDateValue) : 0;
  if (!Number.isFinite(authDateSeconds) || authDateSeconds <= 0) {
    return { ok: false, error: "Invalid auth_date" };
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - authDateSeconds > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, error: "Expired initData" };
  }

  const userPayload = params.get("user");
  if (!userPayload) {
    return { ok: false, error: "Missing user" };
  }

  try {
    const user = JSON.parse(userPayload) as TelegramUser;
    if (!user.id) {
      return { ok: false, error: "Missing user id" };
    }
    return { ok: true, user, authDate: new Date(authDateSeconds * 1000) };
  } catch {
    return { ok: false, error: "Invalid user JSON" };
  }
}

function safeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function webAppUrl(pathname = "/"): string {
  const baseUrl = process.env.WEBAPP_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("WEBAPP_URL is not configured");
  }
  return `${baseUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
