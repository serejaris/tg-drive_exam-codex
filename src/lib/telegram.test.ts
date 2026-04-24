import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { validateTelegramInitData } from "./telegram";

function signedInitData(payload: Record<string, string>, botToken: string): string {
  const dataCheckString = Object.entries(payload)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return new URLSearchParams({ ...payload, hash }).toString();
}

describe("validateTelegramInitData", () => {
  test("accepts initData signed with the bot token", () => {
    const botToken = "123456:test-token";
    const initData = signedInitData(
      {
        auth_date: `${Math.floor(Date.now() / 1000)}`,
        query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
        user: JSON.stringify({ id: 424242, first_name: "Sereja", username: "ris" })
      },
      botToken
    );

    const result = validateTelegramInitData(initData, botToken);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe(424242);
      expect(result.user.username).toBe("ris");
    }
  });

  test("rejects initData with a forged hash", () => {
    const initData = new URLSearchParams({
      auth_date: `${Math.floor(Date.now() / 1000)}`,
      user: JSON.stringify({ id: 1, first_name: "Fake" }),
      hash: "0".repeat(64)
    }).toString();

    expect(validateTelegramInitData(initData, "123456:test-token").ok).toBe(false);
  });
});
