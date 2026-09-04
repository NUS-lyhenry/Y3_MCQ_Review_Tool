import { QuizRunner } from "@/components/quiz-runner";
import { findQuestionSet } from "@/lib/question-library";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const set = findQuestionSet(decodeURIComponent(setId));
  if (!set) return <main className="p-10">Question set not found.</main>;
  return <QuizRunner set={set} />;
}
