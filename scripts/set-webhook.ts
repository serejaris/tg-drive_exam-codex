const token = process.env.TELEGRAM_BOT_TOKEN;
const webappUrl = process.env.WEBAPP_URL?.replace(/\/$/, "");
const secret = process.env.BOT_WEBHOOK_SECRET;

async function main() {
  if (!token || !webappUrl || !secret) {
    console.log("Telegram webhook setup skipped: TELEGRAM_BOT_TOKEN, WEBAPP_URL, or BOT_WEBHOOK_SECRET is missing.");
    return;
  }

  const webhookUrl = `${webappUrl}/api/telegram/webhook/${secret}`;
  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message"],
      drop_pending_updates: false
    })
  });

  const body = (await response.json()) as { ok?: boolean; description?: string };
  if (!response.ok || !body.ok) {
    throw new Error(`Telegram setWebhook failed: ${body.description ?? response.statusText}`);
  }

  console.log(`Telegram webhook configured: ${webhookUrl.replace(secret, "<secret>")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
