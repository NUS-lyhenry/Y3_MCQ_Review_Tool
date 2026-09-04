import assert from "node:assert/strict";
import test from "node:test";

import { buildSession } from "../lib/quiz-engine";
import type { QuestionSet } from "../lib/question-schema";

const set: QuestionSet = {
  id: "session-set",
  courseCode: "COURSE1000",
  courseName: "Course",
  title: "Session",
  tags: [],
  updatedAt: "2026-09-04T04:00:00Z",
  questions: Array.from({ length: 4 }, (_, index) => ({
    id: `question-${index + 1}`,
    revision: 1,
    type: "single" as const,
    prompt: `Question ${index + 1}`,
    options: [
      { id: "a", content: "A", points: 1 },
      { id: "b", content: "B", points: 0 },
      { id: "c", content: "C", points: 0 },
    ],
    maxPoints: 1,
    explanation: "Explanation.",
  })),
};

test("session order is deterministic for a stored seed", () => {
  const config = {
    mode: "exam" as const,
    scope: "all" as const,
    questionCount: 3,
    shuffleQuestions: true,
    shuffleOptions: true,
    timeLimitMinutes: 10,
  };
  const ids = set.questions.map((question) => question.id);
  const now = new Date("2026-09-04T04:00:00Z");
  const first = buildSession(set, config, ids, now, 42);
  const second = buildSession(set, config, ids, now, 42);
  assert.deepEqual(first.questionIds, second.questionIds);
  assert.deepEqual(first.optionOrder, second.optionOrder);
  assert.deepEqual(first.questionRevisions, second.questionRevisions);
  assert.equal(first.questionIds.length, 3);
  assert.equal(first.deadlineAt, "2026-09-04T04:10:00.000Z");
});

test("boolean option order remains conventional", () => {
  const booleanSet: QuestionSet = {
    ...set,
    questions: [{
      id: "boolean",
      revision: 1,
      type: "boolean",
      prompt: "Statement",
      options: [
        { id: "true", content: "True", points: 1 },
        { id: "false", content: "False", points: 0 },
      ],
      maxPoints: 1,
      explanation: "True.",
    }],
  };
  const session = buildSession(
    booleanSet,
    { mode: "study", scope: "all", questionCount: 1, shuffleQuestions: true, shuffleOptions: true, timeLimitMinutes: null },
    ["boolean"],
    new Date("2026-09-04T04:00:00Z"),
    99,
  );
  assert.deepEqual(session.optionOrder.boolean, ["true", "false"]);
});
