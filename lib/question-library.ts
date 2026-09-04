import { parseQuestionSets, type QuestionSet } from "@/lib/question-schema";

const modules = import.meta.glob("/content/question-sets/**/*.json", {
  eager: true,
  import: "default",
});

export const QUESTION_SETS: QuestionSet[] = parseQuestionSets(Object.values(modules));

export function findQuestionSet(setId: string) {
  return QUESTION_SETS.find((set) => set.id === setId);
}

export function getCourses() {
  const courses = new Map<string, { code: string; name: string; sets: QuestionSet[] }>();
  for (const set of QUESTION_SETS) {
    const existing = courses.get(set.courseCode);
    if (existing) {
      existing.sets.push(set);
    } else {
      courses.set(set.courseCode, {
        code: set.courseCode,
        name: set.courseName,
        sets: [set],
      });
    }
  }
  return [...courses.values()].sort((left, right) => left.code.localeCompare(right.code));
}
