# tg-drive_exam-codex

Telegram bot + Telegram Mini App for practicing CABA class B theory questions in ES + RU.

## Stack

- Next.js + TypeScript + React
- Tailwind CSS
- Telegraf
- Prisma
- Railway Postgres
- Dockerfile on Node 24

## Local Run

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

For full local API usage, set a real `DATABASE_URL`, run migrations, then seed:

```bash
npm run db:migrate
npm run db:seed
```

## Railway Deploy

The app is designed to deploy this folder as the service root:

```bash
railway init -n tg-drive-exam-002
railway add --database postgres
railway add --service web
railway domain --service web --port 3000 --json
railway variables --service web --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
railway variables --service web --set 'WEBAPP_URL=https://<generated-domain>'
railway variables --service web --set 'TELEGRAM_BOT_TOKEN=<token>'
railway variables --service web --set 'TELEGRAM_BOT_USERNAME=<bot_username>'
railway variables --service web --set 'BOT_WEBHOOK_SECRET=<generated-secret>'
railway variables --service web --set 'SESSION_SECRET=<generated-secret>'
railway variables --service web --set 'APP_TIMEZONE=America/Argentina/Buenos_Aires'
railway variables --service web --set 'NODE_ENV=production'
railway up --service web
```

On Railway, this service builds from `Dockerfile`. On start, `npm run start:railway` runs migrations, seeds questions, sets the Telegram webhook when secrets are present, then starts Next.js.

Current live deployment:

- Project: `tg-drive-exam-002`
- Web URL: `https://web-production-7ad8f.up.railway.app`
- Bot username: `@deepseek_v4_ris_bot`
- GitHub repo: `serejaris/tg-drive_exam-codex`

## Done

- Telegram `initData` validation.
- Bot webhook endpoint for `/start`, `/practice`, `/exam`, `/status`.
- Mini App Home, Question and Results screens.
- Practice and exam sessions.
- Railway health endpoint.
- Idempotent seed for 40 ES+RU starter questions.

## Not In Thin MVP

- Daily reminders.
- Settings screen.
- Mistakes mode.
- Streak and spaced repetition.
- Admin UI.

## Known Issues

- The app must be opened from Telegram to provide valid `initData`; regular browser access shows an auth message.
- Telegram bot verification requires real `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `BOT_WEBHOOK_SECRET`, `SESSION_SECRET`, and `WEBAPP_URL`.
- Media currently uses external URLs from the source pack; mirroring to storage is post-MVP.
