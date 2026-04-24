"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Progress = {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  completedSessions: number;
};

type OptionDto = {
  optionId: string;
  textEs: string;
  textRu: string;
};

type QuestionDto = {
  id: string;
  category: string;
  questionEs: string;
  questionRu: string;
  type: string;
  media: unknown;
  options: OptionDto[];
};

type SessionDto = {
  id: string;
  mode: "practice" | "exam";
  status: string;
  currentIndex: number;
  score: number;
  total: number;
  questions: QuestionDto[];
};

type AnswerFeedback = {
  isCorrect: boolean;
  correctOptionIds: string[];
  nextIndex: number;
  completed: boolean;
};

type ResultDto = {
  sessionId: string;
  mode: "practice" | "exam";
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  thresholdPercentage: number;
};

export function MiniAppClient() {
  const [authState, setAuthState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [session, setSession] = useState<SessionDto | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [result, setResult] = useState<ResultDto | null>(null);
  const bootModeStarted = useRef(false);

  const bootMode = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const mode = new URLSearchParams(window.location.search).get("mode");
    return mode === "practice" || mode === "exam" ? mode : null;
  }, []);

  const currentQuestion = session?.questions[session.currentIndex] ?? null;

  const refreshMe = useCallback(async () => {
    const me = await requestJson<{ progress: Progress }>("/api/me");
    setProgress(me.progress);
  }, []);

  const startSession = useCallback(async (mode: "practice" | "exam") => {
    setError(null);
    setFeedback(null);
    setResult(null);
    setSelectedOptionIds([]);
    const nextSession = await requestJson<SessionDto>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ mode })
    });
    setSession(nextSession);
  }, []);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();

    async function authenticate() {
      const initData = webApp?.initData;
      if (!initData) {
        setAuthState("error");
        setError("Откройте Mini App из кнопки Telegram-бота, чтобы передать initData.");
        return;
      }

      try {
        await requestJson("/api/auth/telegram", {
          method: "POST",
          body: JSON.stringify({ initData })
        });
        await refreshMe();
        setAuthState("ready");
      } catch (requestError) {
        setAuthState("error");
        setError(requestError instanceof Error ? requestError.message : "Auth failed");
      }
    }

    void authenticate();
  }, [refreshMe]);

  useEffect(() => {
    if (authState === "ready" && bootMode && !bootModeStarted.current) {
      bootModeStarted.current = true;
      startSession(bootMode).catch((requestError: Error) => setError(requestError.message));
    }
  }, [authState, bootMode, startSession]);

  async function submitAnswer() {
    if (!session || !currentQuestion || selectedOptionIds.length === 0) {
      return;
    }

    const answer = await requestJson<AnswerFeedback>(`/api/sessions/${session.id}/answer`, {
      method: "POST",
      body: JSON.stringify({
        question_id: currentQuestion.id,
        selected_option_ids: selectedOptionIds
      })
    });

    if (session.mode === "practice") {
      setFeedback(answer);
      return;
    }

    if (answer.completed) {
      await finishSession(session.id);
    } else {
      setSelectedOptionIds([]);
      setSession({ ...session, currentIndex: answer.nextIndex });
    }
  }

  async function finishSession(sessionId: string) {
    const completed = await requestJson<ResultDto>(`/api/sessions/${sessionId}/complete`, {
      method: "POST"
    });
    setResult(completed);
    setSession(null);
    setFeedback(null);
    setSelectedOptionIds([]);
    await refreshMe();
  }

  function nextQuestion() {
    if (!session || !feedback) {
      return;
    }
    if (feedback.completed) {
      finishSession(session.id).catch((requestError: Error) => setError(requestError.message));
      return;
    }
    setSession({ ...session, currentIndex: feedback.nextIndex });
    setSelectedOptionIds([]);
    setFeedback(null);
  }

  function toggleOption(question: QuestionDto, optionId: string) {
    if (feedback) {
      return;
    }
    if (question.type === "multiple_choice") {
      setSelectedOptionIds((current) =>
        current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
      );
      return;
    }
    setSelectedOptionIds([optionId]);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1 className="brand-title">CABA Drive Exam</h1>
          <span className="brand-subtitle">Clase B · ES + RU</span>
        </div>
      </header>

      <div className="stack">
        {error ? <div className="error">{error}</div> : null}
        {authState === "loading" ? <div className="panel">Загружаем Telegram Mini App...</div> : null}

        {authState === "ready" && !session && !result ? (
          <HomePanel progress={progress} onStartPractice={() => startSession("practice")} onStartExam={() => startSession("exam")} />
        ) : null}

        {session && currentQuestion ? (
          <QuestionPanel
            session={session}
            question={currentQuestion}
            selectedOptionIds={selectedOptionIds}
            feedback={feedback}
            onToggle={toggleOption}
            onSubmit={submitAnswer}
            onNext={nextQuestion}
          />
        ) : null}

        {result ? (
          <ResultPanel
            result={result}
            onHome={() => setResult(null)}
            onStartPractice={() => startSession("practice")}
            onStartExam={() => startSession("exam")}
          />
        ) : null}
      </div>
    </main>
  );
}

function HomePanel({
  progress,
  onStartPractice,
  onStartExam
}: {
  progress: Progress | null;
  onStartPractice: () => void;
  onStartExam: () => void;
}) {
  return (
    <section className="panel stack">
      <div>
        <h2 className="brand-title">Тренировка билетов</h2>
        <p className="muted">40 стартовых вопросов CABA B с оригиналом на испанском и русским переводом.</p>
      </div>
      <div className="stats">
        <div className="stat">
          <span className="stat-value">{progress?.totalAttempts ?? 0}</span>
          <span className="muted">ответов</span>
        </div>
        <div className="stat">
          <span className="stat-value">{progress?.accuracy ?? 0}%</span>
          <span className="muted">accuracy</span>
        </div>
        <div className="stat">
          <span className="stat-value">{progress?.completedSessions ?? 0}</span>
          <span className="muted">прогонов</span>
        </div>
      </div>
      <div className="grid-actions">
        <button className="button" type="button" onClick={onStartPractice}>
          Тренировка
        </button>
        <button className="button secondary" type="button" onClick={onStartExam}>
          Экзамен 40 вопросов
        </button>
      </div>
    </section>
  );
}

function QuestionPanel({
  session,
  question,
  selectedOptionIds,
  feedback,
  onToggle,
  onSubmit,
  onNext
}: {
  session: SessionDto;
  question: QuestionDto;
  selectedOptionIds: string[];
  feedback: AnswerFeedback | null;
  onToggle: (question: QuestionDto, optionId: string) => void;
  onSubmit: () => void;
  onNext: () => void;
}) {
  const mediaUrl = getMediaUrl(question.media);

  return (
    <section className="panel stack">
      <div className="progress-row">
        <span>{session.mode === "exam" ? "Экзамен" : "Тренировка"}</span>
        <span>
          {Math.min(session.currentIndex + 1, session.total)} / {session.total}
        </span>
      </div>

      {mediaUrl ? <img className="media" src={mediaUrl} alt="" /> : null}

      <div className="question-title">
        <p className="question-es">{question.questionEs}</p>
        <p className="question-ru">{question.questionRu}</p>
      </div>

      <div className="stack">
        {question.options.map((option) => {
          const selected = selectedOptionIds.includes(option.optionId);
          const correct = feedback?.correctOptionIds.includes(option.optionId);
          const wrongSelected = feedback && selected && !correct;
          return (
            <button
              key={option.optionId}
              className={`option${selected ? " selected" : ""}${correct ? " correct" : ""}${wrongSelected ? " wrong" : ""}`}
              type="button"
              onClick={() => onToggle(question, option.optionId)}
            >
              <span className="option-es">{option.textEs}</span>
              <span className="option-ru">{option.textRu}</span>
            </button>
          );
        })}
      </div>

      {feedback ? (
        <div className={`feedback ${feedback.isCorrect ? "good" : "bad"}`}>
          {feedback.isCorrect ? "Правильно" : "Неправильно"}
        </div>
      ) : null}

      {feedback ? (
        <button className="button" type="button" onClick={onNext}>
          {feedback.completed ? "Показать результат" : "Следующий вопрос"}
        </button>
      ) : (
        <button className="button" type="button" disabled={selectedOptionIds.length === 0} onClick={onSubmit}>
          Ответить
        </button>
      )}
    </section>
  );
}

function ResultPanel({
  result,
  onHome,
  onStartPractice,
  onStartExam
}: {
  result: ResultDto;
  onHome: () => void;
  onStartPractice: () => void;
  onStartExam: () => void;
}) {
  return (
    <section className="panel stack">
      <div>
        <h2 className="brand-title">{result.passed ? "Зачёт" : "Нужно повторить"}</h2>
        <p className="muted">
          {result.score} / {result.total} правильно · {result.percentage}% · порог {result.thresholdPercentage}%
        </p>
      </div>
      <div className="grid-actions">
        <button className="button" type="button" onClick={onStartPractice}>
          Новая тренировка
        </button>
        <button className="button secondary" type="button" onClick={onStartExam}>
          Новый экзамен
        </button>
        <button className="button secondary" type="button" onClick={onHome}>
          На главную
        </button>
      </div>
    </section>
  );
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Request failed");
  }
  return body as T;
}

function getMediaUrl(media: unknown): string | null {
  if (!media || typeof media !== "object" || !("url" in media)) {
    return null;
  }
  const value = (media as { url?: unknown }).url;
  return typeof value === "string" ? value : null;
}
