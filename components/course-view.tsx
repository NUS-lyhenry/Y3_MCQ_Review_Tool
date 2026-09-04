"use client";

import { Bookmark, ChevronRight, CircleAlert, Layers3, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useReviewState } from "@/hooks/use-review-state";
import type { QuestionSet } from "@/lib/question-schema";
import { getSetStats } from "@/lib/review-store";

export function CourseView({ sets }: { sets: QuestionSet[] }) {
  const { state } = useReviewState();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {sets.map((set) => {
        const stats = getSetStats(set, state);
        const completion = set.questions.length ? (stats.mastered / set.questions.length) * 100 : 0;
        const recent = state.attempts.find((attempt) => attempt.setId === set.id);
        return (
          <a key={set.id} href={`/sets/${set.id}`} className="group" aria-label={`Open ${set.title}`}>
            <Card className="h-full gap-0 py-0 shadow-none transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_36px_rgba(30,64,175,.09)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {set.tags.slice(0, 3).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em]">{set.title}</h2>
                    {set.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{set.description}</p>}
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-[#245fea] transition group-hover:translate-x-0.5">
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </span>
                </div>

                <Progress className="mt-6" value={completion} aria-label={`${Math.round(completion)}% mastered`} />
                <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                  <span>{stats.mastered} of {set.questions.length} mastered</span>
                  <span>{recent ? `Latest ${Math.round((recent.earnedPoints / Math.max(recent.possiblePoints, 1)) * 100)}%` : "Not attempted"}</span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Layers3 className="size-3.5" />{set.questions.length} questions</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground"><CircleAlert className="size-3.5" />{stats.wrong} wrong</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Bookmark className="size-3.5" />{stats.bookmarked} saved</span>
                </div>
              </CardContent>
            </Card>
          </a>
        );
      })}
      {!sets.length && (
        <Card className="border-dashed py-0 shadow-none lg:col-span-2">
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <Trophy className="size-8 text-muted-foreground" />
            <h2 className="mt-4 font-semibold">No question sets found</h2>
            <p className="mt-1 text-sm text-muted-foreground">Return to the library and ask an AI agent to publish a set.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
