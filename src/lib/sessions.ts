import { prisma } from "./prisma";
import { isCorrectSelection, passResult, readTestRules, shuffle } from "./quiz";

export type QuizMode = "practice" | "exam";

type SerializedOption = {
  optionId: string;
  textEs: string;
  textRu: string;
};

type SerializedQuestion = {
  id: string;
  category: string;
  questionEs: string;
  questionRu: string;
  type: string;
  media: unknown;
  options: SerializedOption[];
};

export type SerializedSession = {
  id: string;
  mode: QuizMode;
  status: string;
  currentIndex: number;
  score: number;
  total: number;
  questions: SerializedQuestion[];
  attempts: Array<{
    questionId: string;
    selectedOptionIds: string[];
    isCorrect: boolean;
  }>;
};

export async function createQuizSession(userId: string, mode: QuizMode, requestedLimit?: number) {
  const rules = readTestRules();
  const fallbackLimit = mode === "exam" ? rules.questions_per_run : 10;
  const limit = Math.max(1, Math.min(requestedLimit ?? fallbackLimit, rules.questions_per_run));
  const availableQuestions = await prisma.question.findMany({ select: { id: true } });
  const questionIds = shuffle(availableQuestions.map((question) => question.id)).slice(0, limit);

  if (questionIds.length === 0) {
    throw new Error("No questions are seeded");
  }

  const session = await prisma.quizSession.create({
    data: {
      userId,
      mode,
      questionIds,
      total: questionIds.length
    }
  });

  return serializeSession(session.id, userId);
}

export async function serializeSession(sessionId: string, userId: string): Promise<SerializedSession | null> {
  const session = await prisma.quizSession.findFirst({
    where: { id: sessionId, userId }
  });
  if (!session) {
    return null;
  }

  const questionIds = toStringArray(session.questionIds);
  const [questions, attempts] = await Promise.all([
    prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { options: { orderBy: { sortOrder: "asc" } } }
    }),
    prisma.attempt.findMany({
      where: { sessionId: session.id },
      orderBy: { answeredAt: "asc" }
    })
  ]);

  const questionById = new Map(questions.map((question) => [question.id, question]));

  return {
    id: session.id,
    mode: asQuizMode(session.mode),
    status: session.status,
    currentIndex: session.currentIndex,
    score: session.score,
    total: session.total,
    questions: questionIds.flatMap((questionId) => {
      const question = questionById.get(questionId);
      if (!question) {
        return [];
      }
      return {
        id: question.id,
        category: question.category,
        questionEs: question.questionEs,
        questionRu: question.questionRu,
        type: question.type,
        media: question.media,
        options: seededShuffle(
          question.options.map((option) => ({
            optionId: option.optionId,
            textEs: option.textEs,
            textRu: option.textRu
          })),
          `${session.id}:${question.id}`
        )
      };
    }),
    attempts: attempts.map((attempt) => ({
      questionId: attempt.questionId,
      selectedOptionIds: toStringArray(attempt.selectedOptionIds),
      isCorrect: attempt.isCorrect
    }))
  };
}

export async function answerQuestion(
  userId: string,
  sessionId: string,
  questionId: string,
  selectedOptionIds: string[]
) {
  const session = await prisma.quizSession.findFirst({
    where: { id: sessionId, userId, status: "active" }
  });
  if (!session) {
    throw new Error("Session not found");
  }

  const questionIds = toStringArray(session.questionIds);
  const questionIndex = questionIds.indexOf(questionId);
  if (questionIndex === -1) {
    throw new Error("Question does not belong to this session");
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) {
    throw new Error("Question not found");
  }

  const correctOptionIds = toStringArray(question.correctOptionIds);
  const isCorrect = isCorrectSelection(selectedOptionIds, correctOptionIds);
  const existingAttempt = await prisma.attempt.findUnique({
    where: { sessionId_questionId: { sessionId, questionId } }
  });

  if (!existingAttempt) {
    await prisma.attempt.create({
      data: {
        userId,
        sessionId,
        questionId,
        selectedOptionIds,
        isCorrect
      }
    });
  }

  const attempts = await prisma.attempt.findMany({ where: { sessionId } });
  const score = attempts.filter((attempt) => attempt.isCorrect).length;
  const nextIndex = Math.min(Math.max(session.currentIndex, questionIndex + 1), session.total);

  await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      score,
      currentIndex: nextIndex
    }
  });

  return {
    isCorrect: existingAttempt?.isCorrect ?? isCorrect,
    correctOptionIds,
    nextIndex,
    completed: nextIndex >= session.total
  };
}

export async function completeSession(userId: string, sessionId: string) {
  const session = await prisma.quizSession.findFirst({
    where: { id: sessionId, userId }
  });
  if (!session) {
    throw new Error("Session not found");
  }

  const attempts = await prisma.attempt.findMany({ where: { sessionId } });
  const score = attempts.filter((attempt) => attempt.isCorrect).length;
  const rules = readTestRules();
  const result = passResult(score, session.total, rules.pass_rule.threshold);
  const updatedSession = await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      score,
      currentIndex: session.total,
      completedAt: new Date()
    }
  });

  return {
    sessionId: updatedSession.id,
    mode: asQuizMode(updatedSession.mode),
    score,
    total: updatedSession.total,
    ...result
  };
}

export function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asQuizMode(value: string): QuizMode {
  return value === "exam" ? "exam" : "practice";
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const copy = [...items];
  let state = hash(seed);
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
