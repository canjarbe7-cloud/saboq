import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { CalendarClock, CheckCircle2, ChevronDown, ChevronLeft, Circle, PlayCircle } from "lucide-react";
import { ExpiredNotice } from "@/components/student/expired-notice";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ProgressBar } from "@/components/ui/card";
import { SectionBadge, SectionIcon } from "@/components/ui/section-icon";
import { requireStudent } from "@/server/auth/guards";
import { getCourseForStudent } from "@/server/services/learning";
import { formatDuration } from "@/lib/file-types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

// Sahifa va uning sarlavhasi (metadata) bitta so'rovda bir xil ma'lumotdan foydalanadi
const loadCourse = cache(getCourseForStudent);

export async function generateMetadata({ params }: PageProps<"/kabinet/kurslar/[slug]">): Promise<Metadata> {
  const { user } = await requireStudent();
  const course = await loadCourse(user.id, (await params).slug);
  return { title: course?.title ?? "Kurs" };
}

export default async function StudentCoursePage({ params }: PageProps<"/kabinet/kurslar/[slug]">) {
  const { user } = await requireStudent();
  const { slug } = await params;
  const course = await loadCourse(user.id, slug);
  // Ochilmagan yoki mavjud bo'lmagan kurs bir xil javob oladi — kurs borligi ham bilinmaydi
  if (!course) notFound();
  if (course.access === "expired") return <ExpiredNotice course={course.title} />;

  const t = await getTranslations("student");
  const ts = await getTranslations("sections");
  const modules = course.modules.filter((m) => m.lessons.length > 0);
  // Hammasi tugatilgan bo'lsa — "Qayta ko'rish" birinchi darsdan boshlanadi
  const startId = course.nextLessonId ?? modules[0]?.lessons[0]?.id;
  const totalSec = modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.durationSec, 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/kabinet" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> {t("course.back")}
      </Link>

      <header className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-brand/10 blur-2xl" aria-hidden />
        <div className="relative flex items-start gap-4">
          <SectionIcon section={course.section} className="size-14 rounded-2xl" iconClassName="size-7" />
          <div className="min-w-0">
            <SectionBadge section={course.section} icon={false}>{ts(course.section)}</SectionBadge>
            <h1 className="mt-2 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">{course.title}</h1>
          </div>
        </div>
        {course.description && <p className="relative mt-4 text-pretty leading-relaxed text-muted">{course.description}</p>}

        <div className="relative mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted">
              {t("home.lessons", { done: course.completed, total: course.total })}
              {totalSec > 0 && <> · {formatDuration(totalSec)}</>}
            </span>
            <span className="font-bold tabular-nums">{course.percent}%</span>
          </div>
          <ProgressBar percent={course.percent} className="h-2.5" />
        </div>

        <div className="relative mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {startId && (
            <ButtonLink href={`/kabinet/darslar/${startId}`} size="lg" variant="primary">
              <PlayCircle className="size-5" />
              {course.nextLessonId ? (course.completed > 0 ? t("home.continue") : t("home.start")) : t("home.review")}
            </ButtonLink>
          )}
          {course.expiresAt && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <CalendarClock className="size-4" /> {t("home.expiresOn", { date: formatDate(course.expiresAt) })}
            </span>
          )}
        </div>
      </header>

      {modules.length === 0 ? (
        <EmptyState title={t("course.empty")} text={t("course.emptyText")} />
      ) : (
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold">{t("course.modules")}</h2>
          {modules.map((m, i) => {
            const done = m.lessons.filter((l) => l.completed).length;
            const finished = done === m.lessons.length;
            const hasNext = m.lessons.some((l) => l.id === course.nextLessonId);
            return (
              <details key={m.id} open={hasNext || (i === 0 && !course.nextLessonId)} className="group overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 transition-colors hover:bg-surface-2/60 [&::-webkit-details-marker]:hidden">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold",
                      finished ? "bg-success-soft text-success" : "bg-brand-soft text-brand",
                    )}
                  >
                    {finished ? <CheckCircle2 className="size-5" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{m.title}</span>
                    <span className="text-sm text-muted">{t("home.lessons", { done, total: m.lessons.length })}</span>
                  </span>
                  <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <ul className="border-t border-line p-2">
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      <Link href={`/kabinet/darslar/${l.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2">
                        {l.completed ? (
                          <CheckCircle2 className="size-5 shrink-0 text-success" />
                        ) : l.id === course.nextLessonId ? (
                          <PlayCircle className="size-5 shrink-0 text-brand" />
                        ) : (
                          <Circle className="size-5 shrink-0 text-line" />
                        )}
                        <span className={cn("min-w-0 flex-1", l.id === course.nextLessonId ? "font-bold" : "font-medium")}>{l.title}</span>
                        {l.durationSec > 0 && <span className="text-xs tabular-nums text-muted">{formatDuration(l.durationSec)}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </section>
      )}
    </div>
  );
}
