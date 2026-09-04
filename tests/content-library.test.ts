import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import test from "node:test";

import { scoreQuestion } from "../lib/quiz-engine";
import { parseQuestionSets, type Question } from "../lib/question-schema";

const projectRoot = resolve(import.meta.dirname, "..");
const questionRoot = join(projectRoot, "content", "question-sets");
const publicRoot = join(projectRoot, "public");

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(questionRoot).filter((path) => extname(path).toLowerCase() === ".json");
const sets = parseQuestionSets(files.map((path) => JSON.parse(readFileSync(path, "utf8"))));
const questions = sets.flatMap((set) => set.questions);

const expectedSetIds = [
  "ee2213-informed-search",
  "ee2213-optimization",
  "ee2213-quiz-1-mock",
  "ee2213-search-foundations",
  "ee3431c-band-theory",
  "ee3431c-crystal-structures",
  "ee3431c-dielectrics",
  "ee3431c-quiz-1-mock",
  "ee3731c-ca1-mock",
  "ee3731c-dtft-and-systems",
  "ee3731c-filters-and-wavelets",
  "ee3731c-lti-convolution",
];

test("content manifest contains the intended 12 sets and 120 questions", () => {
  assert.deepEqual(
    sets.map((set) => set.id).sort(),
    expectedSetIds,
  );
  assert.equal(questions.length, 120);

  const counts = Object.fromEntries(
    ["EE2213", "EE3431C", "EE3731C"].map((courseCode) => [
      courseCode,
      sets
        .filter((set) => set.courseCode === courseCode)
        .reduce((total, set) => total + set.questions.length, 0),
    ]),
  );
  assert.deepEqual(counts, { EE2213: 40, EE3431C: 40, EE3731C: 40 });
});

test("question IDs are globally unique and every question is documented", () => {
  const ids = questions.map((question) => question.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const question of questions) {
    assert.ok(question.explanation.trim(), `${question.id} has no explanation`);
    assert.ok(question.source?.trim(), `${question.id} has no source`);
  }
});

test("question Markdown contains neither raw HTML nor inline images", () => {
  const rawHtml = /<\/?[A-Za-z][^>]*>/;
  const inlineImage = /!\[[^\]]*\]\([^)]*\)/;
  for (const question of questions) {
    const markdown = [
      question.prompt,
      question.explanation,
      ...question.options.map((option) => option.content),
    ];
    for (const value of markdown) {
      assert.doesNotMatch(value, rawHtml, `${question.id} contains raw HTML`);
      assert.doesNotMatch(value, inlineImage, `${question.id} contains an inline image`);
    }
  }
});

test("all referenced question images are allowed repository assets", () => {
  for (const question of questions) {
    if (!question.image) continue;
    assert.match(question.image.src, /^\/question-assets\/.+\.(?:png|jpe?g|webp)$/i);
    const path = join(publicRoot, question.image.src.replace(/^\//, ""));
    assert.ok(existsSync(path) && statSync(path).isFile(), `Missing ${question.image.src}`);
  }
});

test("content scoring reaches full credit, clamps penalties, and ignores option order", () => {
  for (const question of questions) {
    const correctIds = question.options.filter((option) => option.points > 0).map((option) => option.id);
    const full = scoreQuestion(question, correctIds);
    assert.equal(full.earnedPoints, question.maxPoints, `${question.id} cannot earn full credit`);

    const reordered: Question = { ...question, options: [...question.options].reverse() };
    assert.deepEqual(scoreQuestion(reordered, correctIds), full, `${question.id} changed after shuffling`);

    const penaltyIds = question.options.filter((option) => option.points < 0).map((option) => option.id);
    if (penaltyIds.length) {
      assert.equal(scoreQuestion(question, penaltyIds).earnedPoints, 0, `${question.id} was not clamped`);
    }
  }
});

test("the EE3431C and EE2213 mock sets are multiple-response throughout", () => {
  for (const setId of ["ee3431c-quiz-1-mock", "ee2213-quiz-1-mock"]) {
    const set = sets.find((candidate) => candidate.id === setId);
    assert.ok(set, `Missing ${setId}`);
    assert.ok(set.questions.every((question) => question.type === "multiple"));
  }
});
