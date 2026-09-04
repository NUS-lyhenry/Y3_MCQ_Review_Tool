import { AppShell } from "@/components/app-shell";
import { CourseView } from "@/components/course-view";
import { QUESTION_SETS } from "@/lib/question-library";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseCode: string }>;
}) {
  const { courseCode } = await params;
  const decodedCode = decodeURIComponent(courseCode);
  const sets = QUESTION_SETS.filter((set) => set.courseCode === decodedCode);
  const courseName = sets[0]?.courseName ?? "Course not found";

  return (
    <AppShell
      backHref="/"
      backLabel="All courses"
      eyebrow={sets.length ? decodedCode : "Library"}
      title={courseName}
      description={sets.length ? `${sets.length} question set${sets.length === 1 ? "" : "s"} available for review.` : "This course is not available in the published library."}
    >
      <CourseView sets={sets} />
    </AppShell>
  );
}
