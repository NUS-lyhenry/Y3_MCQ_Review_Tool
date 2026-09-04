"use client";

import { z } from "zod";

import type { QuestionSet } from "@/lib/question-schema";
import type { Outcome, QuestionResponse, ReviewSession } from "@/lib/quiz-engine";

const STORAGE_KEY = "y3-mcq-review:v1";
export const REVIEW_STATE_EVENT = "y3-mcq-review-state-change";

export type QuestionProgress = {
  attempts: number;
  fullCredits: number;
  earnedPoints: number;
  possiblePoints: number;
  lastOutcome: Outcome;
  lastAnsweredAt: string;
};

export type AttemptSummary = {
  id: string;
  setId: string;
  mode: "study" | "exam";
  earnedPoints: number;
  possiblePoints: number;
  completedAt: string;
};

export type ReviewState = {
  version: 1;
  progress: Record<string, QuestionProgress>;
  bookmarks: Record<string, boolean>;
  activeSession: ReviewSession | null;
  attempts: AttemptSummary[];
};

const outcomeSchema = z.enum(["full", "partial", "zero"]);
const responseSchema = z.object({
  selectedOptionIds: z.array(z.string()),
  earnedPoints: z.number(),
  maxPoints: z.number().positive(),
  outcome: outcomeSchema,
  submittedAt: z.string(),
});
const sessionSchema = z.object({
  id: z.string(),
  setId: z.string(),
  config: z.object({
    mode: z.enum(["study", "exam"]),
    scope: z.enum(["all", "wrong", "bookmarked"]),
    questionCount: z.number().int().positive(),
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
    timeLimitMinutes: z.number().positive().nullable(),
  }),
  questionIds: z.array(z.string()),
  questionRevisions: z.record(z.string(), z.number().int().positive()),
  optionOrder: z.record(z.string(), z.array(z.string())),
  answers: z.record(z.string(), z.array(z.string())),
  responses: z.record(z.string(), responseSchema),
  currentIndex: z.number().int().nonnegative(),
  startedAt: z.string(),
  deadlineAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
const reviewStateSchema = z.object({
  version: z.literal(1),
  progress: z.record(
    z.string(),
    z.object({
      attempts: z.number().int().nonnegative(),
      fullCredits: z.number().int().nonnegative(),
      earnedPoints: z.number().nonnegative(),
      possiblePoints: z.number().nonnegative(),
      lastOutcome: outcomeSchema,
      lastAnsweredAt: z.string(),
    }),
  ),
  bookmarks: z.record(z.string(), z.boolean()),
  activeSession: sessionSchema.nullable(),
  attempts: z.array(
    z.object({
      id: z.string(),
      setId: z.string(),
      mode: z.enum(["study", "exam"]),
      earnedPoints: z.number().nonnegative(),
      possiblePoints: z.number().nonnegative(),
      completedAt: z.string(),
    }),
  ),
});

export function emptyReviewState(): ReviewState {
  return { version: 1, progress: {}, bookmarks: {}, activeSession: null, attempts: [] };
}

export function progressKey(setId: string, questionId: string, revision: number) {
  return `${setId}:${questionId}:r${revision}`;
}

export function bookmarkKey(setId: string, questionId: string) {
  return `${setId}:${questionId}`;
}

export function parseReviewState(value: string | null): ReviewState {
  if (!value) return emptyReviewState();
  try {
    const parsed = reviewStateSchema.safeParse(JSON.parse(value));
    if (!parsed.success) return emptyReviewState();
    return { ...parsed.data, attempts: parsed.data.attempts.slice(0, 30) };
  } catch {
    return emptyReviewState();
  }
}

export function loadReviewState() {
  if (typeof window === "undefined") return emptyReviewState();
  return parseReviewState(window.localStorage.getItem(STORAGE_KEY));
}

export function saveReviewState(state: ReviewState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(REVIEW_STATE_EVENT));
}

export function recordResponse(
  state: ReviewState,
  set: QuestionSet,
  questionId: string,
  response: QuestionResponse,
) {
  const question = set.questions.find((candidate) => candidate.id === questionId);
  if (!question) return state;
  const key = progressKey(set.id, question.id, question.revision);
  const current = state.progress[key];
  return {
    ...state,
    progress: {
      ...state.progress,
      [key]: {
        attempts: (current?.attempts ?? 0) + 1,
        fullCredits: (current?.fullCredits ?? 0) + (response.outcome === "full" ? 1 : 0),
        earnedPoints: (current?.earnedPoints ?? 0) + response.earnedPoints,
        possiblePoints: (current?.possiblePoints ?? 0) + response.maxPoints,
        lastOutcome: response.outcome,
        lastAnsweredAt: response.submittedAt,
      },
    },
  };
}

export function completeAttempt(state: ReviewState, session: ReviewSession) {
  const responses = Object.values(session.responses);
  const summary: AttemptSummary = {
    id: session.id,
    setId: session.setId,
    mode: session.config.mode,
    earnedPoints: responses.reduce((total, response) => total + response.earnedPoints, 0),
    possiblePoints: responses.reduce((total, response) => total + response.maxPoints, 0),
    completedAt: session.completedAt ?? new Date().toISOString(),
  };
  return { ...state, activeSession: session, attempts: [summary, ...state.attempts].slice(0, 30) };
}

export function clearReviewProgress(
  state: ReviewState,
  setId?: string,
  includeBookmarks = false,
): ReviewState {
  if (!setId) {
    return {
      ...emptyReviewState(),
      bookmarks: includeBookmarks ? {} : state.bookmarks,
    };
  }
  const prefix = `${setId}:`;
  return {
    ...state,
    progress: Object.fromEntries(Object.entries(state.progress).filter(([key]) => !key.startsWith(prefix))),
    bookmarks: includeBookmarks
      ? Object.fromEntries(Object.entries(state.bookmarks).filter(([key]) => !key.startsWith(prefix)))
      : state.bookmarks,
    attempts: state.attempts.filter((attempt) => attempt.setId !== setId),
    activeSession: state.activeSession?.setId === setId ? null : state.activeSession,
  };
}

export function eligibleQuestionIds(
  set: QuestionSet,
  state: ReviewState,
  scope: "all" | "wrong" | "bookmarked",
) {
  return set.questions
    .filter((question) => {
      if (scope === "all") return true;
      if (scope === "bookmarked") return Boolean(state.bookmarks[bookmarkKey(set.id, question.id)]);
      const progress = state.progress[progressKey(set.id, question.id, question.revision)];
      return Boolean(progress && progress.lastOutcome !== "full");
    })
    .map((question) => question.id);
}

export function getSetStats(set: QuestionSet, state: ReviewState) {
  let answered = 0;
  let mastered = 0;
  let wrong = 0;
  let bookmarked = 0;
  let earnedPoints = 0;
  let possiblePoints = 0;
  for (const question of set.questions) {
    const progress = state.progress[progressKey(set.id, question.id, question.revision)];
    if (progress) {
      answered += 1;
      earnedPoints += progress.earnedPoints;
      possiblePoints += progress.possiblePoints;
      if (progress.lastOutcome === "full") mastered += 1;
      else wrong += 1;
    }
    if (state.bookmarks[bookmarkKey(set.id, question.id)]) bookmarked += 1;
  }
  return { answered, mastered, wrong, bookmarked, earnedPoints, possiblePoints };
}
