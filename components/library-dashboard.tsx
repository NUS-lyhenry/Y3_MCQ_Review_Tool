"use client";

import { ArrowUpRight, BookOpen, BrainCircuit, ChevronRight, CircleGauge, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useReviewState } from "@/hooks/use-review-state";
import type { QuestionSet } from "@/lib/question-schema";
import { getSetStats, progressKey } from "@/lib/review-store";

export function LibraryDashboard({ questionSets }: { questionSets: QuestionSet[] }) {
  const { state } = useReviewState();
  const courses = questionSets.reduce<Record<string, { name: string; sets: QuestionSet[] }>>((result, set) => {
    const course = result[set.courseCode] ?? { name: set.courseName, sets: [] };
    course.sets.push(set);
    result[set.courseCode] = course;
    return result;
  }, {});
  const totals = questionSets.reduce(
    (summary, set) => {
      const stats = getSetStats(set, state);
      summary.questions += set.questions.length;
      summary.answered += stats.answered;
      summary.fullCredits += set.questions.reduce((total, question) => {
        const progress = state.progress[progressKey(set.id, question.id, question.revision)];
        return total + (progress?.fullCredits ?? 0);
      }, 0);
      summary.attempts += set.questions.reduce((total, question) => {
        const progress = state.progress[progressKey(set.id, question.id, question.revision)];
        return total + (progress?.attempts ?? 0);
      }, 0);
      return summary;
    },
    { questions: 0, answered: 0, fullCredits: 0, attempts: 0 },
  );
  const fullCreditRate = totals.attempts ? `${Math.round((totals.fullCredits / totals.attempts) * 100)}%` : "—";
  const metrics = [
    { label: "Questions answered", value: String(totals.answered), icon: BrainCircuit },
    { label: "Full-credit rate", value: fullCreditRate, icon: CircleGauge },
    { label: "Question sets", value: String(questionSets.length), icon: BookOpen },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-[#07152f] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <a className="flex items-center gap-3" href="/" aria-label="Y3 MCQ Review home">
            <span className="grid size-10 place-items-center rounded-xl bg-[#2f6bff] shadow-[0_8px_24px_rgba(47,107,255,.35)]">
              <BrainCircuit className="size-5" aria-hidden="true" />
            </span>
            <span>
              <strong className="block text-[15px] leading-tight tracking-[-0.01em]">Y3 MCQ Review</strong>
              <span className="block text-[12px] text-blue-200/70">Revision workspace</span>
            </span>
          </a>
          <Badge className="border border-white/10 bg-white/8 px-3 py-1 text-blue-100">Local progress</Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-10 lg:py-10">
        <section aria-labelledby="library-title">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Your library</p>
              <h1 id="library-title" className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Courses and question sets
              </h1>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Question content is versioned with the site. Your answers and bookmarks stay in this browser.
            </p>
          </div>

          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {metrics.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="metric-card gap-0 border-border/70 py-0 shadow-none">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#245fea]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <strong className="block text-2xl leading-none tracking-[-0.04em]">{value}</strong>
                    <span className="mt-1.5 block text-xs text-muted-foreground">{label}</span>
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          {Object.keys(courses).length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(courses).map(([code, course]) => {
                const questionCount = course.sets.reduce((total, set) => total + set.questions.length, 0);
                const mastered = course.sets.reduce((total, set) => total + getSetStats(set, state).mastered, 0);
                return (
                  <a key={code} href={`/courses/${encodeURIComponent(code)}`} className="group" aria-label={`Open ${code} ${course.name}`}>
                    <Card className="h-full gap-0 border-border/75 py-0 shadow-none transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_36px_rgba(30,64,175,.09)]">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Badge variant="secondary">{code}</Badge>
                            <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{course.name}</h2>
                          </div>
                          <span className="grid size-9 place-items-center rounded-full bg-blue-50 text-[#245fea] transition group-hover:translate-x-0.5">
                            <ChevronRight className="size-4" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="mt-7 flex gap-6 border-t pt-4 text-sm">
                          <span><strong>{course.sets.length}</strong> <span className="text-muted-foreground">sets</span></span>
                          <span><strong>{questionCount}</strong> <span className="text-muted-foreground">questions</span></span>
                          <span><strong>{mastered}</strong> <span className="text-muted-foreground">mastered</span></span>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          ) : (
            <Card className="empty-panel overflow-hidden border-dashed py-0 shadow-none">
              <CardContent className="relative flex min-h-[360px] flex-col items-center justify-center px-6 py-14 text-center sm:px-12">
                <span className="empty-grid" aria-hidden="true" />
                <span className="relative grid size-14 place-items-center rounded-2xl border border-blue-200 bg-white text-[#245fea] shadow-[0_12px_34px_rgba(30,64,175,.12)]">
                  <Sparkles className="size-6" aria-hidden="true" />
                </span>
                <h2 className="relative mt-6 text-xl font-semibold tracking-[-0.025em]">Your library is ready for its first set</h2>
                <p className="relative mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                  Ask your AI coding agent to create a question set in this repository. It will validate the content, add any question images, and publish the update here.
                </p>
                <div className="relative mt-6 flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-medium text-[#173b83] shadow-sm">
                  <span className="size-1.5 rounded-full bg-[#f59e0b]" aria-hidden="true" />
                  No course content has been added yet
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-4" aria-label="Getting started">
          <div className="rounded-2xl bg-[#07152f] p-6 text-white shadow-[0_20px_48px_rgba(7,21,47,.16)]">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#72a0ff]">AI authoring</span>
            <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em]">Add a question set</h2>
            <ol className="mt-5 space-y-4 text-sm text-blue-100/75">
              <li className="flex gap-3"><span className="step-number">1</span><span>Choose a course and topic.</span></li>
              <li className="flex gap-3"><span className="step-number">2</span><span>Ask an AI agent to author the set.</span></li>
              <li className="flex gap-3"><span className="step-number">3</span><span>Validate, commit, and republish.</span></li>
            </ol>
            <a className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline decoration-[#f59e0b] decoration-2 underline-offset-4" href="https://github.com/NUS-lyhenry/Y3_MCQ_Review_Tool" target="_blank" rel="noreferrer">
              Open repository <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
          <p className="px-2 text-xs leading-5 text-muted-foreground">
            This public site never uploads your study history. Clearing browser data removes local progress.
          </p>
        </aside>
      </div>
    </main>
  );
}
