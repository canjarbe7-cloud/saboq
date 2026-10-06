import type { Metadata } from "next";
import { CourseList } from "@/components/admin/course-forms";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Kurslar" };

export default async function CoursesPage() {
  await requireAdmin();
  const courses = await db.course.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, title: true, section: true, status: true,
      modules: { select: { _count: { select: { lessons: true } } } },
      _count: { select: { enrollments: true } },
    },
  });
  return (
    <CourseList
      courses={courses.map((c) => ({
        id: c.id, title: c.title, section: c.section, status: c.status,
        modules: c.modules.length,
        lessons: c.modules.reduce((n, m) => n + m._count.lessons, 0),
        students: c._count.enrollments,
      }))}
    />
  );
}
