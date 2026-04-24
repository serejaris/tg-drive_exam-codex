CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "telegram_user_id" BIGINT NOT NULL,
  "chat_id" BIGINT,
  "username" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "questions" (
  "id" TEXT NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "license_class" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "question_es" TEXT NOT NULL,
  "question_ru" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "correct_option_ids" JSONB NOT NULL,
  "media" JSONB,
  "source" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "question_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "question_id" TEXT NOT NULL,
  "option_id" TEXT NOT NULL,
  "text_es" TEXT NOT NULL,
  "text_ru" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quiz_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "question_ids" JSONB NOT NULL,
  "current_index" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "question_id" TEXT NOT NULL,
  "selected_option_ids" JSONB NOT NULL,
  "is_correct" BOOLEAN NOT NULL,
  "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_telegram_user_id_key" ON "users"("telegram_user_id");
CREATE UNIQUE INDEX "question_options_question_id_option_id_key" ON "question_options"("question_id", "option_id");
CREATE UNIQUE INDEX "attempts_session_id_question_id_key" ON "attempts"("session_id", "question_id");

ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
