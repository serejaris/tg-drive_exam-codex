# PRD: Telegram Mini App для подготовки к теоретическому экзамену CABA B

Версия: 1.1 Railway Thin MVP  
Дата: 2026-04-24  
Язык документа: русский  
Целевая юрисдикция: CABA, Argentina  
Категория: B, автомобили

---

## 1. Краткое описание

Нужно создать минимальный Telegram bot + Telegram Mini App для подготовки к теоретическому экзамену CABA категории B. MVP должен быть реально задеплоен на Railway и открываться из Telegram-кнопки.

Главный пользователь: человек, который не знает испанский и хочет быстро потренироваться на вопросах с испанским оригиналом и русским переводом.

---

## 2. Scope MVP

MVP живёт как самостоятельный GitHub-репозиторий `serejaris/tg-drive_exam-codex`. Историческая sandbox-попытка была вынесена из `tg-drive-exam/002-railway-next-mvp/` в отдельную рабочую директорию `/Users/ris/Documents/GitHub/tg-drive_exam-codex`.

Обязательный MVP:

1. Telegram bot webhook на Railway.
2. `/start`, `/practice`, `/exam` с кнопками открытия Mini App.
3. Telegram Mini App с Home, Question, Results.
4. Auth через Telegram `initData`; backend валидирует подпись через bot token.
5. Seed/import 40 вопросов ES+RU из content pack.
6. Practice mode: feedback сразу после ответа.
7. Exam mode: 40 вопросов, результат только в конце.
8. Ответы и сессии сохраняются в Railway Postgres.
9. Health endpoint для Railway.
10. README с локальным запуском, env и Railway deploy.

Не входит в обязательный MVP:

1. Daily reminders.
2. Settings screen.
3. Mistakes mode.
4. Streak.
5. Spaced repetition.
6. Cron endpoint / Railway Cron.
7. Admin UI.
8. Payments.

Эти функции остаются в roadmap после MVP.

---

## 3. Данные

Source pack лежит локально и является read-only:

`/Users/ris/Downloads/caba_licencia_miniapp_pack_v1/data/`

Для Railway данные нужно скопировать внутрь проекта, потому что Railway не имеет доступа к локальному `~/Downloads`.

Использовать двуязычные файлы:

- `questions.caba.b.starter40.es-ru.json`
- `test_rules.es-ru.json`
- `sources.es-ru.md`

Seed должен быть idempotent:

- `question` из pack сохраняется как `question_es`;
- `question_ru` сохраняется как русский перевод;
- `options[].text` сохраняется как `text_es`;
- `options[].text_ru` сохраняется как русский перевод;
- `correct_option_ids`, `media`, `source`, `status` сохраняются без перевода.

Content pack на дату PRD:

- 40 вопросов;
- 21 вопрос с `media`;
- pass threshold из `test_rules.es-ru.json`: `0.75`.

---

## 4. Product Flow

### 4.1 Telegram

1. Пользователь отправляет `/start`.
2. Bot сохраняет Telegram user и chat.
3. Bot отправляет сообщение с Web App buttons:
   - `Открыть тренировку`;
   - `Пройти экзамен`.

### 4.2 Mini App Auth

1. Frontend читает `Telegram.WebApp.initData`.
2. Frontend отправляет `initData` на `POST /api/auth/telegram`.
3. Backend валидирует подпись.
4. Backend создаёт/обновляет пользователя и ставит httpOnly session cookie.
5. Frontend загружает `/api/me`.

### 4.3 Practice

1. Пользователь запускает practice.
2. Backend создаёт quiz session.
3. App показывает вопрос ES + RU, варианты ES + RU и media, если есть.
4. После ответа app сразу показывает correct/wrong.
5. После последнего вопроса app показывает Results.

### 4.4 Exam

1. Пользователь запускает exam.
2. Backend создаёт session на 40 вопросов или меньше, если в базе меньше.
3. App не показывает feedback по ходу экзамена.
4. После последнего ответа app показывает Results.
5. Pass/fail считается по threshold из `test_rules.es-ru.json`.

---

## 5. API

Required endpoints:

- `GET /api/health`
- `POST /api/auth/telegram`
- `GET /api/me`
- `POST /api/sessions`
- `GET /api/sessions/:id`
- `POST /api/sessions/:id/answer`
- `POST /api/sessions/:id/complete`
- `POST /api/telegram/webhook/:secret`

Auth requirements:

- Mini App frontend не доверяет `initDataUnsafe`.
- Backend валидирует Telegram `initData`.
- API для quiz требует session cookie.

---

## 6. Data Model

Минимальные таблицы:

- `users`
- `questions`
- `question_options`
- `quiz_sessions`
- `attempts`

MVP использует Railway Postgres. SQLite/local-only database не подходит для deploy target.

---

## 7. Tech Stack

Обязательный stack:

- Next.js + TypeScript.
- React.
- Tailwind CSS.
- Telegraf.
- Prisma.
- Railway Postgres.
- Railway web service.
- Dockerfile runtime on Node 24 for Railway deploy stability.

Railway hosting:

- один Railway project;
- `web` service для Next.js UI + API + Telegram webhook;
- `Postgres` service для database;
- deploy из корня репозитория через `railway up --service web`;
- service build uses the project `Dockerfile`.

---

## 8. Environment

Required Railway variables for `web`:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
WEBAPP_URL=https://<generated-domain>
TELEGRAM_BOT_TOKEN=<provided before deploy>
TELEGRAM_BOT_USERNAME=<provided before deploy>
BOT_WEBHOOK_SECRET=<generated>
SESSION_SECRET=<generated>
APP_TIMEZONE=America/Argentina/Buenos_Aires
NODE_ENV=production
```

Secrets must not be committed.

---

## 9. Railway Deploy

Target: live Railway deploy, not only deploy instructions.

Expected commands:

```bash
railway init -n tg-drive-exam-002
railway add --database postgres
railway add --service web
railway domain --service web --port 3000 --json
railway variables --service web --set "DATABASE_URL=${{Postgres.DATABASE_URL}}"
railway up --service web
```

Before live bot verification, Telegram secrets must be available. If Telegram token is missing, web deploy may still work, but `/start` and webhook cannot be accepted as complete.

---

## 10. Acceptance Criteria

MVP is accepted if:

1. Railway project exists.
2. Railway web service deploy succeeds.
3. Railway Postgres is attached via `DATABASE_URL`.
4. `/api/health` returns OK on the Railway domain.
5. Prisma migrations run on deploy.
6. Seed imports exactly 40 questions.
7. Telegram webhook is configured without exposing token/secret in logs.
8. `/start` sends Mini App buttons.
9. Mini App opens inside Telegram.
10. Practice mode records answers and shows immediate feedback.
11. Exam mode records answers and shows score only at the end.
12. Results show score, percentage and pass/fail.
13. README documents local run and Railway deploy.
14. `.env.example` exists.
15. `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` pass.

---

## 11. Roadmap After MVP

1. Daily reminders via Railway Cron.
2. Settings screen.
3. Mistakes mode.
4. Weak-question repetition.
5. Streak.
6. Spaced repetition.
7. More than 40 questions.
8. Admin UI for translations.
9. Media mirroring to Railway Volume / R2.
10. Manual validation against official CABA materials.
