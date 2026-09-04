import assert from "node:assert/strict";
import test from "node:test";

import { scoreQuestion } from "../lib/quiz-engine";
import type { Question } from "../lib/question-schema";

const question: Question = {
  id: "weighted-selection",
  revision: 1,
  type: "multiple",
  prompt: "Select the valid statements.",
  options: [
    { id: "a", content: "A", points: 1 },
    { id: "b", content: "B", points: 1 },
    { id: "c", content: "C", points: -0.75 },
  ],
  maxPoints: 2,
  explanation: "A and B are valid.",
};

test("weighted scoring recognizes full and partial credit", () => {
  assert.deepEqual(scoreQuestion(question, ["a", "b"]), {
    earnedPoints: 2,
    maxPoints: 2,
    outcome: "full",
  });
  assert.deepEqual(scoreQuestion(question, ["a"]), {
    earnedPoints: 1,
    maxPoints: 2,
    outcome: "partial",
  });
});

test("weighted scoring clamps penalties at zero", () => {
  assert.deepEqual(scoreQuestion(question, ["c"]), {
    earnedPoints: 0,
    maxPoints: 2,
    outcome: "zero",
  });
  assert.deepEqual(scoreQuestion(question, ["a", "b", "c"]), {
    earnedPoints: 1.25,
    maxPoints: 2,
    outcome: "partial",
  });
});
