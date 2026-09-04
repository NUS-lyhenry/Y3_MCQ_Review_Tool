import assert from "node:assert/strict";
import test from "node:test";

import { parseQuestionSets, questionSetSchema } from "../lib/question-schema";

function validSet() {
  return {
    id: "core-review",
    courseCode: "COURSE1000",
    courseName: "Course Name",
    title: "Core review",
    tags: ["core"],
    updatedAt: "2026-09-04T12:00:00+08:00",
    questions: [
      {
        id: "single-question",
        revision: 1,
        type: "single",
        prompt: "Pick one.",
        options: [
          { id: "a", content: "A", points: 1 },
          { id: "b", content: "B", points: 0 },
        ],
        maxPoints: 1,
        explanation: "A is correct.",
      },
      {
        id: "multiple-question",
        revision: 1,
        type: "multiple",
        prompt: "Pick two.",
        image: { src: "/question-assets/course1000/core-review/figure.webp", alt: "A labelled figure" },
        options: [
          { id: "a", content: "A", points: 0.5 },
          { id: "b", content: "B", points: 0.5 },
          { id: "c", content: "C", points: -0.25 },
        ],
        maxPoints: 1,
        explanation: "A and B are correct.",
      },
      {
        id: "boolean-question",
        revision: 1,
        type: "boolean",
        prompt: "True or false?",
        options: [
          { id: "true", content: "True", points: 1 },
          { id: "false", content: "False", points: 0 },
        ],
        maxPoints: 1,
        explanation: "The statement is true.",
      },
    ],
  };
}

test("schema accepts all supported question types", () => {
  assert.equal(questionSetSchema.parse(validSet()).questions.length, 3);
});

test("schema rejects duplicate question IDs", () => {
  const set = validSet();
  set.questions[1].id = set.questions[0].id;
  assert.throws(() => questionSetSchema.parse(set));
});

test("schema rejects scoring that does not total maxPoints", () => {
  const set = validSet();
  set.questions[1].options[1].points = 0.25;
  assert.throws(() => questionSetSchema.parse(set));
});

test("schema rejects unsupported image locations", () => {
  const set = validSet();
  set.questions[1].image = { src: "https://example.com/figure.png", alt: "Figure" };
  assert.throws(() => questionSetSchema.parse(set));
});

test("library rejects duplicate set IDs", () => {
  assert.throws(() => parseQuestionSets([validSet(), validSet()]), /Duplicate question-set ID/);
});
