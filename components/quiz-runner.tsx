"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  ListChecks,
  RotateCcw,
  X,
} from "lucide-react";

import { MarkdownContent } from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useReviewState } from "@/hooks/use-review-state";
import type { Question, QuestionSet } from "@/lib/question-schema";
import {
  completeAttempt,
  bookmarkKey,
  recordResponse,
} from "@/lib/review-store";
import { formatPoints, scoreQuestion, type QuestionResponse } from "@/lib/quiz-engine";

function formatDuration(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}

function optionClass(selected: boolean, submitted: boolean, points: number) {
  if (!submitted) return "answer-choice";
  if (points > 0) return "answer-choice is-correct";
  if (selected) return "answer-choice is-incorrect";
  return "answer-choice is-muted";
}

function orderedOptions(question: Question, order?: string[]) {
  if (!order) return question.options;
  return order.map((id) => question.options.find((option) => option.id === id)).filter(Boolean) as Question["options"];
}

export function QuizRunner({ set }: { set: QuestionSet }) {
  const router = useRouter();
  const { state, update, hydrated } = useReviewState();
  const session = state.activeSession?.setId === set.id ? state.activeSession : null;
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const staleSession = Boolean(
    session?.questionIds.some((questionId) => {
      const question = set.questions.find((candidate) => candidate.id === questionId);
      return !question || question.revision !== session.questionRevisions?.[questionId];
    }),
  );
  const currentQuestion = session ? set.questions.find((question) => question.id === session.questionIds[session.currentIndex]) : undefined;
  const selected = currentQuestion && session ? session.answers[currentQuestion.id] ?? [] : [];
  const submitted = Boolean(currentQuestion && session?.responses[currentQuestion.id]);
  const isBookmarked = Boolean(currentQuestion && state.bookmarks[bookmarkKey(set.id, currentQuestion.id)]);

  const finishExam = useCallback(() => {
    update((current) => {
      const active = current.activeSession;
      if (!active || active.setId !== set.id || active.completedAt) return current;
      let next = current;
      const submittedAt = new Date().toISOString();
      const responses: Record<string, QuestionResponse> = {};
      for (const questionId of active.questionIds) {
        const question = set.questions.find((candidate) => candidate.id === questionId);
        if (!question) continue;
        const selectedOptionIds = active.answers[questionId] ?? [];
        responses[questionId] = {
          selectedOptionIds,
          ...scoreQuestion(question, selectedOptionIds),
          submittedAt,
        };
        next = recordResponse(next, set, questionId, responses[questionId]);
      }
      const completed = { ...active, responses, completedAt: submittedAt };
      return completeAttempt({ ...next, activeSession: completed }, completed);
    });
    setSubmitDialogOpen(false);
  }, [set, update]);

  useEffect(() => {
    if (!session?.deadlineAt || session.completedAt || staleSession) return;
    const refresh = () => {
      const remaining = Math.ceil((new Date(session.deadlineAt!).getTime() - Date.now()) / 1000);
      setRemainingSeconds(Math.max(0, remaining));
      if (remaining <= 0) finishExam();
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, [finishExam, session?.completedAt, session?.deadlineAt, staleSession]);

  const totals = useMemo(() => {
    const responses = Object.values(session?.responses ?? {});
    return {
      earned: responses.reduce((sum, response) => sum + response.earnedPoints, 0),
      possible: responses.reduce((sum, response) => sum + response.maxPoints, 0),
      full: responses.filter((response) => response.outcome === "full").length,
      partial: responses.filter((response) => response.outcome === "partial").length,
      zero: responses.filter((response) => response.outcome === "zero").length,
    };
  }, [session?.responses]);

  function toggleOption(optionId: string) {
    if (!session || !currentQuestion || session.completedAt || (session.config.mode === "study" && submitted)) return;
    update((current) => {
      const active = current.activeSession;
      if (!active || active.id !== session.id) return current;
      const currentAnswer = active.answers[currentQuestion.id] ?? [];
      const nextAnswer =
        currentQuestion.type === "multiple"
          ? currentAnswer.includes(optionId)
            ? currentAnswer.filter((id) => id !== optionId)
            : [...currentAnswer, optionId]
          : [optionId];
      return {
        ...current,
        activeSession: {
          ...active,
          answers: { ...active.answers, [currentQuestion.id]: nextAnswer },
        },
      };
    });
  }

  function toggleBookmark() {
    if (!currentQuestion) return;
    const key = bookmarkKey(set.id, currentQuestion.id);
    update((current) => ({
      ...current,
      bookmarks: { ...current.bookmarks, [key]: !current.bookmarks[key] },
    }));
  }

  function submitStudyQuestion() {
    if (!session || !currentQuestion || !selected.length || submitted) return;
    update((current) => {
      const active = current.activeSession;
      if (!active || active.id !== session.id) return current;
      const response: QuestionResponse = {
        selectedOptionIds: active.answers[currentQuestion.id] ?? [],
        ...scoreQuestion(currentQuestion, active.answers[currentQuestion.id] ?? []),
        submittedAt: new Date().toISOString(),
      };
      const nextSession = {
        ...active,
        responses: { ...active.responses, [currentQuestion.id]: response },
      };
      return recordResponse({ ...current, activeSession: nextSession }, set, currentQuestion.id, response);
    });
  }

  function moveTo(index: number) {
    if (!session) return;
    update((current) => {
      const active = current.activeSession;
      if (!active || active.id !== session.id) return current;
      return {
        ...current,
        activeSession: {
          ...active,
          currentIndex: Math.max(0, Math.min(index, active.questionIds.length - 1)),
        },
      };
    });
  }

  function nextStudyQuestion() {
    if (!session || !submitted) return;
    if (session.currentIndex < session.questionIds.length - 1) {
      moveTo(session.currentIndex + 1);
      return;
    }
    update((current) => {
      const active = current.activeSession;
      if (!active || active.id !== session.id || active.completedAt) return current;
      const completed = { ...active, completedAt: new Date().toISOString() };
      return completeAttempt({ ...current, activeSession: completed }, completed);
    });
  }

  function closeSession() {
    update((current) => ({ ...current, activeSession: null }));
    router.push(`/sets/${set.id}`);
  }

  useEffect(() => {
    if (!session || !currentQuestion || session.completedAt) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleBookmark();
        return;
      }
      const optionIndex = Number(event.key) - 1;
      const options = orderedOptions(currentQuestion, session.optionOrder[currentQuestion.id]);
      if (Number.isInteger(optionIndex) && optionIndex >= 0 && optionIndex < options.length) {
        event.preventDefault();
        toggleOption(options[optionIndex].id);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-5 py-10 sm:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8">
        <ListChecks className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-5 text-2xl font-semibold">No active session</h1>
        <p className="mt-2 text-muted-foreground">Configure a new study or exam session for this set.</p>
        <Button className="mt-6" onClick={() => router.push(`/sets/${set.id}`)}>Return to set</Button>
      </div>
    );
  }

  if (staleSession) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8">
        <RotateCcw className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-5 text-2xl font-semibold">This question set was updated</h1>
        <p className="mt-2 text-muted-foreground">Start a fresh session to use the latest published revision.</p>
        <Button className="mt-6" onClick={closeSession}>Return to set</Button>
      </div>
    );
  }

  if (session.completedAt) {
    const percentage = totals.possible ? Math.round((totals.earned / totals.possible) * 100) : 0;
    const elapsed = Math.max(0, Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000));
    return (
      <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:py-12">
        <div className="mx-auto max-w-5xl">
          <section className="result-hero">
            <Badge className="bg-white/10 text-blue-100">{session.config.mode === "study" ? "Study complete" : "Exam submitted"}</Badge>
            <div className="mt-6 grid items-end gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm text-blue-100/70">{set.courseCode} · {set.title}</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{percentage}%</h1>
                <p className="mt-3 text-blue-100/75">{formatPoints(totals.earned)} of {formatPoints(totals.possible)} points · {formatDuration(elapsed)}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="result-stat"><strong>{totals.full}</strong><span>Full</span></div>
                <div className="result-stat"><strong>{totals.partial}</strong><span>Partial</span></div>
                <div className="result-stat"><strong>{totals.zero}</strong><span>Zero</span></div>
              </div>
            </div>
          </section>

          <div className="mt-8 space-y-4">
            {session.questionIds.map((questionId, index) => {
              const question = set.questions.find((candidate) => candidate.id === questionId);
              const response = session.responses[questionId];
              if (!question || !response) return null;
              const correct = question.options.filter((option) => option.points > 0);
              const selectedLabels = question.options.filter((option) => response.selectedOptionIds.includes(option.id));
              return (
                <Card key={questionId} className="gap-0 py-0 shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Question {index + 1}</span>
                      <Badge variant={response.outcome === "full" ? "default" : "secondary"}>
                        {formatPoints(response.earnedPoints)} / {formatPoints(response.maxPoints)}
                      </Badge>
                    </div>
                    <MarkdownContent className="mt-4 font-medium">{question.prompt}</MarkdownContent>
                    <dl className="mt-5 grid gap-3 border-t pt-5 text-sm">
                      <div><dt className="font-medium text-muted-foreground">Your answer</dt><dd className="mt-1">{selectedLabels.length ? selectedLabels.map((option) => option.content).join(", ") : "Unanswered"}</dd></div>
                      <div><dt className="font-medium text-muted-foreground">Full-credit answer</dt><dd className="mt-1">{correct.map((option) => option.content).join(", ")}</dd></div>
                    </dl>
                    <div className="mt-5 rounded-xl bg-blue-50 p-4 text-[#173b83]">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em]">Explanation</p>
                      <MarkdownContent className="mt-2">{question.explanation}</MarkdownContent>
                      {question.source && <p className="mt-3 text-xs text-[#315a9d]">Source: {question.source}</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="h-11 px-5" onClick={closeSession}>Return to question set</Button>
            <Button size="lg" className="h-11 px-5" variant="outline" onClick={() => router.push("/")}>All courses</Button>
          </div>
        </div>
      </main>
    );
  }

  if (!currentQuestion) return null;
  const options = orderedOptions(currentQuestion, session.optionOrder[currentQuestion.id]);
  const response = session.responses[currentQuestion.id];
  const answeredCount = session.questionIds.filter((id) => (session.answers[id] ?? []).length > 0).length;

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-[#07152f] text-white">
        <div className="mx-auto max-w-6xl px-5 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs text-blue-200/70">{set.courseCode} · {set.title}</p>
              <h1 className="mt-1 text-sm font-semibold">{session.config.mode === "study" ? "Study session" : "Exam session"}</h1>
            </div>
            <div className="flex items-center gap-3">
              {session.deadlineAt && remainingSeconds !== null && (
                <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ${remainingSeconds < 60 ? "bg-red-500/20 text-red-100" : "bg-white/10 text-blue-100"}`}>
                  <Clock3 className="size-4" />{formatDuration(remainingSeconds)}
                </span>
              )}
              <Button variant="ghost" className="text-blue-100 hover:bg-white/10 hover:text-white" onClick={() => router.push(`/sets/${set.id}`)}>
                Exit
              </Button>
            </div>
          </div>
          <Progress className="mt-4 [&_[data-slot=progress-track]]:bg-white/15 [&_[data-slot=progress-indicator]]:bg-[#72a0ff]" value={((session.currentIndex + 1) / session.questionIds.length) * 100} />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:py-10">
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-muted-foreground">Question {session.currentIndex + 1} of {session.questionIds.length}</span>
            <Button variant="ghost" size="sm" onClick={toggleBookmark} aria-label={isBookmarked ? "Remove bookmark" : "Bookmark question"}>
              {isBookmarked ? <BookmarkCheck className="text-[#245fea]" /> : <Bookmark />}
              {isBookmarked ? "Saved" : "Save"}
            </Button>
          </div>

          <Card className="gap-0 py-0 shadow-[0_18px_50px_rgba(30,64,175,.07)]">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-2">
                <Badge variant="secondary">{currentQuestion.type === "multiple" ? "Select all that apply" : currentQuestion.type === "boolean" ? "True or false" : "Choose one"}</Badge>
                <span className="text-xs text-muted-foreground">{formatPoints(currentQuestion.maxPoints)} {currentQuestion.maxPoints === 1 ? "point" : "points"}</span>
              </div>
              <MarkdownContent className="question-prompt">{currentQuestion.prompt}</MarkdownContent>
              {currentQuestion.image && (
                <figure className="mt-6 overflow-hidden rounded-xl border bg-white p-2">
                  <Image className="mx-auto max-h-[420px] h-auto w-auto rounded-lg object-contain" src={currentQuestion.image.src} alt={currentQuestion.image.alt} width={1200} height={800} unoptimized />
                  <figcaption className="px-2 pb-1 pt-3 text-center text-xs text-muted-foreground">{currentQuestion.image.alt}</figcaption>
                </figure>
              )}

              {currentQuestion.type === "multiple" ? (
                <div className="mt-7 space-y-3">
                  {options.map((option, index) => (
                    <label key={option.id} className={optionClass(selected.includes(option.id), submitted, option.points)}>
                      <Checkbox checked={selected.includes(option.id)} onCheckedChange={() => toggleOption(option.id)} disabled={submitted} />
                      <span className="option-key">{index + 1}</span>
                      <MarkdownContent className="min-w-0 flex-1">{option.content}</MarkdownContent>
                      {submitted && option.points > 0 && <Check className="size-4 text-emerald-600" aria-label="Full-credit option" />}
                      {submitted && selected.includes(option.id) && option.points <= 0 && <X className="size-4 text-red-600" aria-label="Incorrect option" />}
                    </label>
                  ))}
                </div>
              ) : (
                <RadioGroup className="mt-7 space-y-3" value={selected[0] ?? ""} onValueChange={toggleOption}>
                  {options.map((option, index) => (
                    <label key={option.id} className={optionClass(selected.includes(option.id), submitted, option.points)}>
                      <RadioGroupItem value={option.id} disabled={submitted} />
                      <span className="option-key">{index + 1}</span>
                      <MarkdownContent className="min-w-0 flex-1">{option.content}</MarkdownContent>
                      {submitted && option.points > 0 && <Check className="size-4 text-emerald-600" aria-label="Full-credit option" />}
                      {submitted && selected.includes(option.id) && option.points <= 0 && <X className="size-4 text-red-600" aria-label="Incorrect option" />}
                    </label>
                  ))}
                </RadioGroup>
              )}

              {session.config.mode === "study" && response && (
                <div className={`feedback-panel ${response.outcome}`}>
                  <div className="flex items-center gap-2 font-semibold">
                    {response.outcome === "full" ? <CheckCircle2 className="size-5" /> : <Flag className="size-5" />}
                    {response.outcome === "full" ? "Full credit" : response.outcome === "partial" ? "Partial credit" : "Not quite"}
                    <span className="ml-auto text-sm">{formatPoints(response.earnedPoints)} / {formatPoints(response.maxPoints)}</span>
                  </div>
                  <MarkdownContent className="mt-3">{currentQuestion.explanation}</MarkdownContent>
                  {currentQuestion.source && <p className="mt-3 text-xs opacity-75">Source: {currentQuestion.source}</p>}
                </div>
              )}

              <div className="mt-7 flex items-center justify-between gap-3 border-t pt-6">
                <Button variant="outline" onClick={() => moveTo(session.currentIndex - 1)} disabled={session.currentIndex === 0}>
                  <ChevronLeft /> Previous
                </Button>
                {session.config.mode === "study" ? (
                  submitted ? (
                    <Button onClick={nextStudyQuestion}>
                      {session.currentIndex === session.questionIds.length - 1 ? "View results" : "Next question"} <ChevronRight data-icon="inline-end" />
                    </Button>
                  ) : (
                    <Button onClick={submitStudyQuestion} disabled={!selected.length}>Check answer</Button>
                  )
                ) : (
                  <Button onClick={() => moveTo(session.currentIndex + 1)} disabled={session.currentIndex === session.questionIds.length - 1}>
                    Next <ChevronRight data-icon="inline-end" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside>
          <Card className="sticky top-32 gap-0 py-0 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{session.config.mode === "exam" ? "Answered" : "Progress"}</span>
                <span className="text-muted-foreground">{session.config.mode === "exam" ? answeredCount : Object.keys(session.responses).length}/{session.questionIds.length}</span>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {session.questionIds.map((questionId, index) => {
                  const hasAnswer = Boolean((session.answers[questionId] ?? []).length);
                  const hasResponse = Boolean(session.responses[questionId]);
                  return (
                    <Button
                      key={questionId}
                      size="icon-sm"
                      variant={index === session.currentIndex ? "default" : "outline"}
                      className={index !== session.currentIndex && (hasResponse || hasAnswer) ? "border-blue-300 bg-blue-50 text-[#245fea]" : ""}
                      onClick={() => moveTo(index)}
                      aria-label={`Go to question ${index + 1}`}
                    >
                      {index + 1}
                    </Button>
                  );
                })}
              </div>
              {session.config.mode === "exam" && (
                <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                  <DialogTrigger render={<Button className="mt-5 w-full" variant="secondary" />}>
                    Submit exam
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit this exam?</DialogTitle>
                      <DialogDescription>
                        {session.questionIds.length - answeredCount
                          ? `${session.questionIds.length - answeredCount} question(s) are unanswered and will receive zero points.`
                          : "All questions have an answer. You cannot change them after submission."}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Keep reviewing</Button>
                      <Button onClick={finishExam}>Submit exam</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <p className="mt-4 text-xs leading-5 text-muted-foreground">Press 1–9 to choose an option. Press B to bookmark.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
