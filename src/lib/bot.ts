import { Context, Markup, Telegraf } from "telegraf";
import { prisma } from "./prisma";
import { webAppUrl } from "./telegram";

export function createBot(): Telegraf {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    await upsertTelegramUser(ctx);
    await ctx.reply(
      "Готовим CABA categoria B: вопросы на испанском с русским переводом.",
      miniAppKeyboard()
    );
  });

  bot.command("practice", async (ctx) => {
    await upsertTelegramUser(ctx);
    await ctx.reply("Открой тренировку в Mini App.", miniAppKeyboard("practice"));
  });

  bot.command("exam", async (ctx) => {
    await upsertTelegramUser(ctx);
    await ctx.reply("Открой экзаменационный прогон на 40 вопросов.", miniAppKeyboard("exam"));
  });

  bot.command("status", async (ctx) => {
    const user = await upsertTelegramUser(ctx);
    const [totalAttempts, correctAttempts] = await Promise.all([
      prisma.attempt.count({ where: { userId: user.id } }),
      prisma.attempt.count({ where: { userId: user.id, isCorrect: true } })
    ]);
    const accuracy = totalAttempts === 0 ? 0 : Math.round((correctAttempts / totalAttempts) * 100);
    await ctx.reply(`Статус: ${correctAttempts}/${totalAttempts} правильно, accuracy ${accuracy}%.`);
  });

  return bot;
}

function miniAppKeyboard(mode?: "practice" | "exam") {
  const suffix = mode ? `/?mode=${mode}` : "/";
  return Markup.inlineKeyboard([
    [Markup.button.webApp("Открыть тренировку", webAppUrl(suffix))],
    [Markup.button.webApp("Пройти экзамен", webAppUrl("/?mode=exam"))]
  ]);
}

async function upsertTelegramUser(ctx: Context) {
  if (!ctx.from) {
    throw new Error("Telegram update has no sender");
  }
  return prisma.user.upsert({
    where: { telegramUserId: BigInt(ctx.from.id) },
    update: {
      chatId: ctx.chat?.id ? BigInt(ctx.chat.id) : undefined,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name
    },
    create: {
      telegramUserId: BigInt(ctx.from.id),
      chatId: ctx.chat?.id ? BigInt(ctx.chat.id) : null,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name
    }
  });
}
