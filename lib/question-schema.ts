import { z } from "zod";

const stableId = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase kebab-case IDs.");

const optionSchema = z.object({
  id: stableId,
  content: z.string().trim().min(1),
  points: z.number(),
});

const imageSchema = z.object({
  src: z
    .string()
    .regex(
      /^\/question-assets\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp)$/i,
      "Images must be repository assets under /question-assets/.",
    ),
  alt: z.string().trim().min(1),
});

export const questionSchema = z
  .object({
    id: stableId,
    revision: z.number().int().positive(),
    type: z.enum(["single", "multiple", "boolean"]),
    prompt: z.string().trim().min(1),
    image: imageSchema.optional(),
    options: z.array(optionSchema).min(2).max(10),
    maxPoints: z.number().positive(),
    explanation: z.string().trim().min(1),
    source: z.string().trim().min(1).optional(),
  })
  .superRefine((question, context) => {
    const optionIds = new Set(question.options.map((option) => option.id));
    if (optionIds.size !== question.options.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Option IDs must be unique within a question.",
      });
    }

    const positiveOptions = question.options.filter((option) => option.points > 0);
    const positiveTotal = positiveOptions.reduce((total, option) => total + option.points, 0);
    if (Math.abs(positiveTotal - question.maxPoints) > 1e-8) {
      context.addIssue({
        code: "custom",
        path: ["maxPoints"],
        message: "Positive option points must add up to maxPoints.",
      });
    }

    if (question.type === "multiple" && positiveOptions.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Multiple-choice questions require at least two positive options.",
      });
    }

    if (question.type !== "multiple" && positiveOptions.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Single-choice and boolean questions require exactly one positive option.",
      });
    }

    if (question.type === "boolean" && question.options.length !== 2) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Boolean questions require exactly two options.",
      });
    }
  });

export const questionSetSchema = z
  .object({
    id: stableId,
    courseCode: z.string().trim().min(2).max(24).regex(/^[A-Za-z0-9-]+$/),
    courseName: z.string().trim().min(2).max(120),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(1).max(800).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    updatedAt: z.iso.datetime({ offset: true }),
    questions: z.array(questionSchema).min(1),
  })
  .superRefine((set, context) => {
    const questionIds = new Set(set.questions.map((question) => question.id));
    if (questionIds.size !== set.questions.length) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Question IDs must be unique within a question set.",
      });
    }
  });

export type QuestionOption = z.infer<typeof optionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuestionSet = z.infer<typeof questionSetSchema>;

export function parseQuestionSets(records: unknown[]): QuestionSet[] {
  const sets = records.map((record) => questionSetSchema.parse(record));
  const ids = new Set<string>();
  for (const set of sets) {
    if (ids.has(set.id)) throw new Error(`Duplicate question-set ID: ${set.id}`);
    ids.add(set.id);
  }
  return sets.sort((left, right) =>
    left.courseCode.localeCompare(right.courseCode) || left.title.localeCompare(right.title),
  );
}
