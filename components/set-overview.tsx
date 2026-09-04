"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, CheckCircle2, Clock3, Play, RotateCcw, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReviewState } from "@/hooks/use-review-state";
import type { QuestionSet } from "@/lib/question-schema";
import { buildSession, type ReviewMode, type StudyScope } from "@/lib/quiz-engine";
import { eligibleQuestionIds, getSetStats } from "@/lib/review-store";

const timerOptions = [5, 10, 20, 30, 60];

export function SetOverview({ set }: { set: QuestionSet }) {
  const router = useRouter();
  const { state, update } = useReviewState();
  const [mode, setMode] = useState<ReviewMode>("study");
  const [scope, setScope] = useState<StudyScope>("all");
  const [questionCount, setQuestionCount] = useState(set.questions.length);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);
  const stats = getSetStats(set, state);
  const eligible = useMemo(
    () => eligibleQuestionIds(set, state, mode === "exam" ? "all" : scope),
    [mode, scope, set, state],
  );
  const availableCounts = [...new Set([5, 10, 20, set.questions.length])]
    .filter((count) => count <= set.questions.length)
    .sort((left, right) => left - right);
  const resumable = state.activeSession?.setId === set.id;

  function startSession() {
    if (!eligible.length) return;
    const count = mode === "study" ? eligible.length : Math.min(questionCount, eligible.length);
    const session = buildSession(
      set,
      {
        mode,
        scope: mode === "exam" ? "all" : scope,
        questionCount: count,
        shuffleQuestions,
        shuffleOptions,
        timeLimitMinutes: mode === "exam" && timerEnabled ? timeLimitMinutes : null,
      },
      eligible,
    );
    update((current) => ({ ...current, activeSession: session }));
    router.push(`/sets/${set.id}/quiz`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-6 py-5">
          <CardTitle className="text-lg">Configure a session</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={mode} onValueChange={(value) => setMode(value as ReviewMode)}>
            <TabsList className="mb-6 h-10 w-full max-w-sm">
              <TabsTrigger value="study" className="h-full">Study</TabsTrigger>
              <TabsTrigger value="exam" className="h-full">Exam</TabsTrigger>
            </TabsList>

            <TabsContent value="study">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Choose what to review</legend>
                <RadioGroup value={scope} onValueChange={(value) => setScope(value as StudyScope)} className="grid gap-3 sm:grid-cols-3">
                  {[
                    { value: "all", label: "All questions", count: set.questions.length, icon: RotateCcw },
                    { value: "wrong", label: "Wrong answers", count: stats.wrong, icon: CheckCircle2 },
                    { value: "bookmarked", label: "Bookmarked", count: stats.bookmarked, icon: Bookmark },
                  ].map(({ value, label, count, icon: Icon }) => (
                    <label key={value} htmlFor={`scope-${value}`} className="option-tile cursor-pointer">
                      <RadioGroupItem id={`scope-${value}`} value={value} disabled={value !== "all" && count === 0} />
                      <span className="min-w-0">
                        <Icon className="mb-3 size-4 text-[#245fea]" aria-hidden="true" />
                        <span className="block font-medium">{label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{count} available</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
            </TabsContent>

            <TabsContent value="exam">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 text-sm font-semibold">
                  <span>Number of questions</span>
                  <Select value={String(Math.min(questionCount, set.questions.length))} onValueChange={(value) => setQuestionCount(Number(value))}>
                    <SelectTrigger className="h-10 w-full" aria-label="Number of questions"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableCounts.map((count) => <SelectItem key={count} value={String(count)}>{count === set.questions.length ? `All ${count}` : count}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Time limit</span>
                    <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} aria-label="Enable time limit" />
                  </div>
                  <Select disabled={!timerEnabled} value={String(timeLimitMinutes)} onValueChange={(value) => setTimeLimitMinutes(Number(value))}>
                    <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {timerOptions.map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} minutes</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" aria-hidden="true" />
                Answers and explanations remain hidden until submission.
              </p>
            </TabsContent>
          </Tabs>

          <div className="mt-7 grid gap-3 border-t pt-6 sm:grid-cols-2">
            <label htmlFor="shuffle-questions" className="setting-row">
              <span><Shuffle className="size-4" />Shuffle questions</span>
              <Switch id="shuffle-questions" checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} aria-label="Shuffle questions" />
            </label>
            <label htmlFor="shuffle-options" className="setting-row">
              <span><Shuffle className="size-4" />Shuffle options</span>
              <Switch id="shuffle-options" checked={shuffleOptions} onCheckedChange={setShuffleOptions} aria-label="Shuffle options" />
            </label>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-11 px-5" onClick={startSession} disabled={!eligible.length}>
              <Play data-icon="inline-start" /> Start {mode === "study" ? "study" : "exam"}
            </Button>
            {resumable && (
              <Button size="lg" className="h-11 px-5" variant="outline" onClick={() => router.push(`/sets/${set.id}/quiz`)}>
                {state.activeSession?.completedAt ? "View latest result" : "Resume session"}
              </Button>
            )}
          </div>
          {!eligible.length && <p className="mt-3 text-sm text-amber-700">No questions currently match this study scope.</p>}
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <Card className="gap-0 py-0 shadow-none">
          <CardContent className="p-6">
            <p className="eyebrow">Progress</p>
            <strong className="mt-3 block text-4xl tracking-[-0.05em]">{stats.mastered}<span className="text-lg font-medium text-muted-foreground">/{set.questions.length}</span></strong>
            <p className="mt-1 text-sm text-muted-foreground">questions mastered</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 text-sm">
              <div><dt className="text-muted-foreground">Wrong</dt><dd className="mt-1 text-lg font-semibold">{stats.wrong}</dd></div>
              <div><dt className="text-muted-foreground">Saved</dt><dd className="mt-1 text-lg font-semibold">{stats.bookmarked}</dd></div>
              <div><dt className="text-muted-foreground">Answered</dt><dd className="mt-1 text-lg font-semibold">{stats.answered}</dd></div>
              <div><dt className="text-muted-foreground">Attempts</dt><dd className="mt-1 text-lg font-semibold">{state.attempts.filter((attempt) => attempt.setId === set.id).length}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <p className="px-2 text-xs leading-5 text-muted-foreground">
          Full credit marks a question as mastered. Partial or zero credit keeps it in your wrong-answer queue.
        </p>
      </aside>
    </div>
  );
}
