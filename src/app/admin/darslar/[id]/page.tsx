import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/admin-shell";
import { LessonForm, MaterialsManager } from "@/components/admin/lesson-forms";
import { VideoUploader } from "@/components/admin/video-uploader";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { isVideoConfigured } from "@/server/video/bunny";

const loadLesson = cache((id: string) =>
  db.lesson.findUnique({
    where: { id },
    include: {
      module: { select: { title: true, course: { select: { id: true, title: true } } } },
      materials: { orderBy: { position: "asc" }, select: { id: true, title: true, type: true, sizeBytes: true } },
    },
  }),
);

export async function generateMetadata({ params }: PageProps<"/admin/darslar/[id]">): Promise<Metadata> {
  await requireAdmin();
  return { title: (await loadLesson((await params).id))?.title ?? "Dars" };
}

export default async function LessonPage({ params }: PageProps<"/admin/darslar/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const lesson = await loadLesson(id);
  if (!lesson) notFound();
  const t = await getTranslations();

  return (
    <>
      <PageHeader title={lesson.title} back={{ href: `/admin/kurslar/${lesson.module.course.id}`, label: lesson.module.course.title }} />
      <p className="-mt-4 mb-6 text-sm text-muted">{lesson.module.title}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardTitle>{t("admin.lesson.video")}</CardTitle>
            {!isVideoConfigured() && <p className="mb-3 rounded-xl bg-surface-2 p-3 text-sm text-muted">{t("admin.lesson.videoLocalNote")}</p>}
            <VideoUploader
              lessonId={lesson.id} status={lesson.videoStatus} durationSec={lesson.durationSec}
              mode={isVideoConfigured() ? "bunny" : "local"}
            />
          </Card>
          <Card>
            <CardTitle>{t("admin.lesson.materials")}</CardTitle>
            <MaterialsManager lessonId={lesson.id} materials={lesson.materials} />
          </Card>
        </div>
        <Card className="self-start">
          <CardTitle>{t("admin.lesson.details")}</CardTitle>
          <LessonForm
            courseId={lesson.module.course.id}
            videoReady={lesson.videoStatus === "READY" || lesson.materials.length > 0}
            lesson={{ id: lesson.id, title: lesson.title, description: lesson.description, status: lesson.status }}
          />
        </Card>
      </div>
    </>
  );
}
