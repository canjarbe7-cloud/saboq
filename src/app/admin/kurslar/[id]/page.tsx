import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/admin-shell";
import { CourseSettings, CourseStructure, CourseVisibility } from "@/components/admin/course-forms";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/guards";
import { getCourseTree } from "@/server/services/courses";

// Sahifa va uning sarlavhasi (metadata) bitta so'rovda bir xil ma'lumotdan foydalanadi
const loadCourse = cache(getCourseTree);

export async function generateMetadata({ params }: PageProps<"/admin/kurslar/[id]">): Promise<Metadata> {
  await requireAdmin();
  return { title: (await loadCourse((await params).id))?.title ?? "Kurs" };
}

export default async function CoursePage({ params }: PageProps<"/admin/kurslar/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const course = await loadCourse(id);
  if (!course) notFound();
  const t = await getTranslations("admin.courses");

  // Kurs o'quvchiga ko'rinishi uchun: kurs, modul va dars — uchalasi ham nashr qilingan bo'lishi kerak
  const lessons = course.modules.flatMap((m) => m.lessons);
  const ready = (l: (typeof lessons)[number]) => l.videoStatus === "READY" || l._count.materials > 0;
  const draftModules = course.modules.filter((m) => m.status === "DRAFT" && m.lessons.some(ready)).length;
  const draftLessons = lessons.filter((l) => l.status === "DRAFT" && ready(l)).length;
  const emptyLessons = lessons.filter((l) => l.status === "DRAFT" && !ready(l)).length;
  const issues = [
    course.status === "DRAFT" && t("issueCourseDraft"),
    lessons.length === 0 && t("issueNoLessons"),
    draftModules > 0 && t("issueModulesDraft", { count: draftModules }),
    draftLessons > 0 && t("issueLessonsDraft", { count: draftLessons }),
    emptyLessons > 0 && t("issueLessonsEmpty", { count: emptyLessons }),
    course._count.enrollments === 0 && t("issueNoStudents"),
  ].filter((i): i is string => Boolean(i));
  const canPublish = lessons.some(ready) && (course.status === "DRAFT" || draftModules > 0 || draftLessons > 0);

  return (
    <>
      <PageHeader title={course.title} back={{ href: "/admin/kurslar", label: t("title") }} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-3 text-lg font-bold">{t("structure")}</h2>
          <CourseStructure
            courseId={course.id}
            modules={course.modules.map((m) => ({
              id: m.id, title: m.title, status: m.status,
              lessons: m.lessons.map((l) => ({
                id: l.id, title: l.title, status: l.status, videoStatus: l.videoStatus, durationSec: l.durationSec, materials: l._count.materials,
              })),
            }))}
          />
        </section>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle>{t("visibility")}</CardTitle>
            <p className="-mt-2 mb-3 text-sm text-muted">{t("studentsCount", { count: course._count.enrollments })}</p>
            <CourseVisibility courseId={course.id} issues={issues} canPublish={canPublish} />
          </Card>
          <Card>
            <CardTitle>{t("settings")}</CardTitle>
            {/* key: kurs boshqa joyda (masalan "Hammasini nashr qilish") o'zgarsa, forma yangi qiymatlardan qayta boshlanadi */}
            <CourseSettings
              key={`${course.status}-${course.updatedAt.getTime()}`}
              course={{ id: course.id, title: course.title, section: course.section, description: course.description, status: course.status }}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
