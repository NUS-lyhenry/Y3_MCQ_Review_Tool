import { AppShell } from "@/components/app-shell";
import { SetOverview } from "@/components/set-overview";
import { findQuestionSet } from "@/lib/question-library";

export default async function QuestionSetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const set = findQuestionSet(decodeURIComponent(setId));

  if (!set) {
    return (
      <AppShell backHref="/" backLabel="All courses" eyebrow="Library" title="Question set not found">
        <p className="text-muted-foreground">This set is not part of the published library.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      backHref={`/courses/${encodeURIComponent(set.courseCode)}`}
      backLabel={set.courseCode}
      eyebrow={set.courseCode}
      title={set.title}
      description={set.description ?? `${set.questions.length} questions ready for review.`}
    >
      <SetOverview set={set} />
    </AppShell>
  );
}
