import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

import { parseQuestionSets } from "../lib/question-schema";

const projectRoot = resolve(import.meta.dirname, "..");
const questionRoot = join(projectRoot, "content", "question-sets");
const publicRoot = join(projectRoot, "public");

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(questionRoot).filter((path) => extname(path).toLowerCase() === ".json");
const records = files.map((path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Unable to parse ${relative(projectRoot, path)}: ${String(error)}`);
  }
});

const sets = parseQuestionSets(records);
for (const set of sets) {
  for (const question of set.questions) {
    if (!question.image) continue;
    const assetPath = join(publicRoot, question.image.src.replace(/^\//, ""));
    if (!existsSync(assetPath) || !statSync(assetPath).isFile()) {
      throw new Error(`Missing image for ${set.id}/${question.id}: ${question.image.src}`);
    }
  }
}

console.log(`Validated ${sets.length} question set(s) across ${files.length} JSON file(s).`);
