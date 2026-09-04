"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { QuestionSet } from "@/lib/question-schema";
import { buildSession, type ReviewMode, type StudyScope } from "@/lib/quiz-engine";
import {
  clearReviewProgress,
  eligibleQuestionIds,
  getSetStats,
  loadReviewState,
  saveReviewState,
} from "@/lib/review-store";

function asObject(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Expected an object.");
  }
  return input as Record<string, unknown>;
}

export function ReviewProvider({
  questionSets,
  children,
}: {
  questionSets: QuestionSet[];
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const report = (error: unknown) => console.warn("WebMCP registration failed", error);

    const registrations = [
      context.registerTool(
        {
          name: "list_review_library",
          title: "List review library",
          description: "List available courses and question sets with progress stored in this browser.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute() {
            const state = loadReviewState();
            return {
              courses: questionSets.reduce<Record<string, { courseName: string; sets: unknown[] }>>((courses, set) => {
                const course = courses[set.courseCode] ?? { courseName: set.courseName, sets: [] };
                course.sets.push({
                  id: set.id,
                  title: set.title,
                  questionCount: set.questions.length,
                  progress: getSetStats(set, state),
                });
                courses[set.courseCode] = course;
                return courses;
              }, {}),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
      context.registerTool(
        {
          name: "start_review_session",
          title: "Start review session",
          description: "Start and open a visible study or exam session for an existing question set.",
          inputSchema: {
            type: "object",
            properties: {
              setId: { type: "string" },
              mode: { type: "string", enum: ["study", "exam"] },
              scope: { type: "string", enum: ["all", "wrong", "bookmarked"] },
              questionCount: { type: "integer", minimum: 1 },
              shuffleQuestions: { type: "boolean" },
              shuffleOptions: { type: "boolean" },
              timeLimitMinutes: { type: ["number", "null"], exclusiveMinimum: 0 },
            },
            required: ["setId", "mode", "scope", "questionCount", "shuffleQuestions", "shuffleOptions", "timeLimitMinutes"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            const values = asObject(input);
            const set = questionSets.find((candidate) => candidate.id === values.setId);
            if (!set) throw new Error("Question set not found.");
            const mode = values.mode as ReviewMode;
            const scope = (mode === "exam" ? "all" : values.scope) as StudyScope;
            if (!["study", "exam"].includes(mode) || !["all", "wrong", "bookmarked"].includes(scope)) {
              throw new Error("Invalid review mode or scope.");
            }
            const state = loadReviewState();
            const eligible = eligibleQuestionIds(set, state, scope);
            if (eligible.length === 0) throw new Error("No questions match this session scope.");
            const requestedCount = Number(values.questionCount);
            if (!Number.isInteger(requestedCount) || requestedCount < 1) throw new Error("questionCount must be a positive integer.");
            const timeLimit = values.timeLimitMinutes === null ? null : Number(values.timeLimitMinutes);
            if (timeLimit !== null && (!Number.isFinite(timeLimit) || timeLimit <= 0)) {
              throw new Error("timeLimitMinutes must be null or a positive number.");
            }
            const session = buildSession(
              set,
              {
                mode,
                scope,
                questionCount: Math.min(requestedCount, eligible.length),
                shuffleQuestions: Boolean(values.shuffleQuestions),
                shuffleOptions: Boolean(values.shuffleOptions),
                timeLimitMinutes: mode === "exam" ? timeLimit : null,
              },
              eligible,
            );
            saveReviewState({ ...state, activeSession: session });
            router.push(`/sets/${set.id}/quiz`);
            return { status: "started", sessionId: session.id, questionCount: session.questionIds.length };
          },
        },
        { signal: lifecycle.signal },
      ),
      context.registerTool(
        {
          name: "clear_review_progress",
          title: "Clear review progress",
          description: "Clear progress for one question set or the whole local library after explicit user confirmation.",
          inputSchema: {
            type: "object",
            properties: {
              setId: { type: ["string", "null"] },
              includeBookmarks: { type: "boolean" },
              confirm: { type: "boolean" },
            },
            required: ["setId", "includeBookmarks", "confirm"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            const values = asObject(input);
            if (values.confirm !== true) throw new Error("Explicit confirmation is required.");
            if (values.setId !== null && typeof values.setId !== "string") {
              throw new Error("setId must be a string or null.");
            }
            const setId = values.setId === null ? undefined : values.setId;
            if (setId && !questionSets.some((set) => set.id === setId)) throw new Error("Question set not found.");
            const next = clearReviewProgress(loadReviewState(), setId, Boolean(values.includeBookmarks));
            saveReviewState(next);
            return { status: "cleared", scope: setId ?? "all", bookmarksCleared: Boolean(values.includeBookmarks) };
          },
        },
        { signal: lifecycle.signal },
      ),
    ];

    for (const registration of registrations) {
      void Promise.resolve(registration).catch(report);
    }
    return () => lifecycle.abort();
  }, [questionSets, router]);

  return children;
}
