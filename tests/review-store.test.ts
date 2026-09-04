import assert from "node:assert/strict";
import test from "node:test";

import type { QuestionSet } from "../lib/question-schema";
import {
  clearReviewProgress,
  eligibleQuestionIds,
  emptyReviewState,
  parseReviewState,
  progressKey,
  recordResponse,
} from "../lib/review-store";

const set: QuestionSet = {
  id: "progress-set",
  courseCode: "COURSE1000",
  courseName: "Course",
  title: "Progress",
  tags: [],
  updatedAt: "2026-09-04T04:00:00Z",
  questions: [{
    id: "question",
    revision: 2,
    type: "single",
    prompt: "Question",
    options: [
      { id: "a", content: "A", points: 1 },
      { id: "b", content: "B", points: 0 },
    ],
    maxPoints: 1,
    explanation: "A.",
  }],
};

test("corrupt and legacy local state safely reset", () => {
  assert.deepEqual(parseReviewState("{broken"), emptyReviewState());
  assert.deepEqual(parseReviewState(JSON.stringify({ version: 0, progress: { bad: true } })), emptyReviewState());
  assert.deepEqual(
    parseReviewState(JSON.stringify({ ...emptyReviewState(), progress: { bad: { attempts: "many" } } })),
    emptyReviewState(),
  );
});

test("progress is keyed by question revision", () => {
  const response = {
    selectedOptionIds: ["b"],
    earnedPoints: 0,
    maxPoints: 1,
    outcome: "zero" as const,
    submittedAt: "2026-09-04T04:00:00Z",
  };
  const state = recordResponse(emptyReviewState(), set, "question", response);
  assert.ok(state.progress[progressKey(set.id, "question", 2)]);
  assert.equal(state.progress[progressKey(set.id, "question", 1)], undefined);
  assert.deepEqual(eligibleQuestionIds(set, state, "wrong"), ["question"]);
});

test("clearing set progress can preserve bookmarks", () => {
  const state = {
    ...emptyReviewState(),
    progress: {
      [progressKey(set.id, "question", 2)]: {
        attempts: 1,
        fullCredits: 0,
        earnedPoints: 0,
        possiblePoints: 1,
        lastOutcome: "zero" as const,
        lastAnsweredAt: "2026-09-04T04:00:00Z",
      },
    },
    bookmarks: { "progress-set:question": true },
  };
  const cleared = clearReviewProgress(state, set.id, false);
  assert.deepEqual(cleared.progress, {});
  assert.equal(cleared.bookmarks["progress-set:question"], true);
});
