import { LibraryDashboard } from "@/components/library-dashboard";
import { QUESTION_SETS } from "@/lib/question-library";

export default function Home() {
  return <LibraryDashboard questionSets={QUESTION_SETS} />;
}
