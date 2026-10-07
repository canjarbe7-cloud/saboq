import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, CheckCircle2, Download, FileText, Music, PlayCircle } from "lucide-react";
import { ExpiredNotice } from "@/components/student/expired-notice";
import { LessonView } from "@/components/student/lesson-view";
import { Card } from "@/components/ui/card";
import { requireStudent } from "@/server/auth/guards";
import { getLessonForStudent } from "@/server/services/learning";
import { formatBytes, formatDuration } from "@/lib/file-types";
import { formatPhone } from "@/lib/validation";
import { cn } from "@/lib/cn";

// Sahifa va uning sarlavhasi (metadata) bitta so'rovda bir xil ma'lumotdan foydalanadi
const loadLesson = cache(getLessonForStudent);

export async function generateMetadata({ params }: PageProps<"/kabinet/darslar/[id]">): Promise<Metadata> {
  const { user } = await requireStudent();
  const data = await loadLesson(user.id, (await params).id);
  return { title: data && data.access !== "expired" ? data.lesson.title : "Dars" };
}

export default async function StudentLessonPage({ params }: PageProps<"/kabinet/darslar/[id]">) {
  const { user } = await requireStudent();
  const { id } = await params;
  const data = await loadLesson(user.id, id);
  if (!data) notFound();
  if (data.access === "expired") return <ExpiredNotice course={data.course.title} />;

  const t = await getTranslations("student");
  const { lesson, course, prev, next } = data;
  // Video oxirida saqlangan bo'lsa, boshidan boshlaymiz
  const startAt = lesson.durationSec && data.positionSec > lesson.durationSec - 15 ? 0 : data.positionSec;
  const flat = data.modules.flatMap((m) => m.lessons);
  const doneCount = flat.filter((l) => l.completed).length;
  const lastRemaining = flat.every((l) => l.completed || l.id === lesson.id);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-5">
        <div>
          <Link href={`/kabinet/kurslar/${course.slug}`} className="-my-2 inline-flex items-center gap-1 py-2 text-sm font-medium text-muted hover:text-fg">
            <ChevronLeft className="size-4" /> {course.title}
          </Link>
          <h1 className="mt-1 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">{lesson.title}</h1>
          <p className="mt-0.5 text-sm text-muted">{lesson.module.title}</p>
        </div>

        <LessonView
          key={lesson.id}
          lessonId={lesson.id}
          startAt={startAt}
          watermark={`${user.name} · ${formatPhone(user.phone)}`}
          initialCompleted={data.completed}
          hasVideo={lesson.videoStatus === "READY"}
          prev={prev && { id: prev.id, title: prev.title }}
          next={next && { id: next.id, title: next.title }}
          lastRemaining={lastRemaining}
        />

        {/* Tavsif yozilmagan bo'lsa, bo'sh kartochka ko'rsatilmaydi */}
        {lesson.description && (
          <Card>
            <h2 className="text-lg font-bold">{t("lesson.about")}</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-muted">{lesson.description}</p>
          </Card>
        )}

        {lesson.materials.length > 0 && (
          <Card>
            <h2 className="mb-3 text-lg font-bold">{t("lesson.materials")}</h2>
            <ul className="space-y-2">
              {lesson.materials.map((m) => (
                <li key={m.id} className="overflow-hidden rounded-xl border border-line bg-surface-2/60">
                  <a href={`/api/materials/${m.id}`} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-brand-soft">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", m.type === "PDF" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand")}>
                      {m.type === "PDF" ? <FileText className="size-5" /> : <Music className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{m.title}</span>
                      <span className="text-xs text-muted">{m.type} · {formatBytes(m.sizeBytes)}</span>
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg text-muted" title={t("lesson.download")}>
                      <Download className="size-5" aria-label={t("lesson.download")} />
                    </span>
                  </a>
                  {/* Listening audiosini sahifaning o'zida tinglash */}
                  {m.type === "AUDIO" && (
                    <audio controls preload="metadata" controlsList="nodownload" src={`/api/materials/${m.id}?inline=1`} className="block w-full px-3 pb-3" />
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <aside className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
        <Card className="p-3">
          <div className="px-2 pb-3 pt-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t("lesson.lessonList")}</h2>
              <span className="text-xs font-bold tabular-nums text-muted">{doneCount}/{flat.length}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${flat.length ? (doneCount / flat.length) * 100 : 0}%` }} />
            </div>
          </div>
          {data.modules.filter((m) => m.lessons.length > 0).map((m) => (
            <div key={m.title} className="mb-2 last:mb-0">
              <p className="px-2 py-1.5 text-sm font-bold">{m.title}</p>
              <ul>
                {m.lessons.map((l) => {
                  const current = l.id === lesson.id;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/kabinet/darslar/${l.id}`} aria-current={current ? "page" : undefined}
                        className={cn("flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors", current ? "bg-brand-soft font-bold text-brand" : "hover:bg-surface-2")}
                      >
                        {l.completed ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <PlayCircle className={cn("size-4 shrink-0", current ? "text-brand" : "text-muted")} />}
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        {l.durationSec > 0 && <span className="text-xs tabular-nums text-muted">{formatDuration(l.durationSec)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </Card>
      </aside>
    </div>
  );
}
