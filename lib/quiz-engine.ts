import type { Question, QuestionSet } from "@/lib/question-schema";

export type Outcome = "full" | "partial" | "zero";
export type ReviewMode = "study" | "exam";
export type StudyScope = "all" | "wrong" | "bookmarked";

export type SessionConfig = {
  mode: ReviewMode;
  scope: StudyScope;
  questionCount: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  timeLimitMinutes: number | null;
};

export type QuestionResponse = {
  selectedOptionIds: string[];
  earnedPoints: number;
  maxPoints: number;
  outcome: Outcome;
  submittedAt: string;
};

export type ReviewSession = {
  id: string;
  setId: string;
  config: SessionConfig;
  questionIds: string[];
  questionRevisions: Record<string, number>;
  optionOrder: Record<string, string[]>;
  answers: Record<string, string[]>;
  responses: Record<string, QuestionResponse>;
  currentIndex: number;
  startedAt: string;
  deadlineAt: string | null;
  completedAt: string | null;
};

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function scoreQuestion(question: Question, selectedOptionIds: string[]) {
  const selected = new Set(selectedOptionIds);
  const rawPoints = question.options.reduce(
    (total, option) => total + (selected.has(option.id) ? option.points : 0),
    0,
  );
  const earnedPoints = clamp(rawPoints, 0, question.maxPoints);
  const outcome: Outcome =
    Math.abs(earnedPoints - question.maxPoints) < 1e-8
      ? "full"
      : earnedPoints > 0
        ? "partial"
        : "zero";
  return { earnedPoints, maxPoints: question.maxPoints, outcome };
}

export function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(values: T[], random = Math.random) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export function buildSession(
  set: QuestionSet,
  config: SessionConfig,
  eligibleQuestionIds: string[],
  now = new Date(),
  seed = now.getTime(),
): ReviewSession {
  const random = createSeededRandom(seed);
  const eligible = set.questions.filter((question) => eligibleQuestionIds.includes(question.id));
  const ordered = config.shuffleQuestions ? shuffled(eligible, random) : eligible;
  const selected = ordered.slice(0, Math.max(0, Math.min(config.questionCount, ordered.length)));
  const optionOrder = Object.fromEntries(
    selected.map((question) => [
      question.id,
      config.shuffleOptions && question.type !== "boolean"
        ? shuffled(question.options.map((option) => option.id), random)
        : question.options.map((option) => option.id),
    ]),
  );
  const deadlineAt =
    config.mode === "exam" && config.timeLimitMinutes
      ? new Date(now.getTime() + config.timeLimitMinutes * 60_000).toISOString()
      : null;
  return {
    id: `${set.id}-${seed.toString(36)}`,
    setId: set.id,
    config,
    questionIds: selected.map((question) => question.id),
    questionRevisions: Object.fromEntries(selected.map((question) => [question.id, question.revision])),
    optionOrder,
    answers: {},
    responses: {},
    currentIndex: 0,
    startedAt: now.toISOString(),
    deadlineAt,
    completedAt: null,
  };
}

export function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
