import type { CourseSection, PublishStatus } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { slugify } from "@/lib/validation";
import { deleteVideo } from "@/server/video/bunny";
import { storage } from "@/server/storage";

/** Kurs → Modul → Dars tuzilmasini boshqarish (faqat admin chaqiradi). */

async function uniqueSlug(title: string, exceptId?: string) {
  const base = slugify(title) || "kurs";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const clash = await db.course.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === exceptId) return slug;
  }
  return `${base}-${Date.now()}`;
}

const nextPosition = async (count: Promise<number>) => await count;

export async function createCourse(input: { title: string; section: CourseSection; description: string }) {
  return db.course.create({
    data: { ...input, slug: await uniqueSlug(input.title), position: await nextPosition(db.course.count()) },
  });
}

export async function updateCourse(
  id: string,
  input: { title: string; section: CourseSection; description: string; status: PublishStatus },
) {
  const course = await db.course.findUnique({ where: { id } });
  if (!course) throw new AppError("notFound");
  return db.course.update({ where: { id }, data: input });
}

export async function createModule(courseId: string, title: string) {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) throw new AppError("notFound");
  return db.module.create({
    data: { courseId, title, position: await nextPosition(db.module.count({ where: { courseId } })) },
  });
}

export async function updateModule(id: string, input: { title: string; status: PublishStatus }) {
  return db.module.update({ where: { id }, data: input }).catch(() => {
    throw new AppError("notFound");
  });
}

export async function createLesson(moduleId: string, title: string) {
  const mod = await db.module.findUnique({ where: { id: moduleId }, select: { id: true } });
  if (!mod) throw new AppError("notFound");
  return db.lesson.create({
    data: { moduleId, title, position: await nextPosition(db.lesson.count({ where: { moduleId } })) },
  });
}

export async function updateLesson(id: string, input: { title: string; description: string; status: PublishStatus }) {
  const lesson = await db.lesson.findUnique({ where: { id } });
  if (!lesson) throw new AppError("notFound");
  if (input.status === "PUBLISHED" && !(await isLessonPublishable(id))) throw new AppError("lessonNoVideo");
  return db.lesson.update({ where: { id }, data: input });
}

/** Darsni nashr qilish uchun tayyor video yoki kamida bitta material (audio/PDF) bo'lishi kerak. */
export async function isLessonPublishable(id: string): Promise<boolean> {
  const lesson = await db.lesson.findUnique({ where: { id }, select: { videoStatus: true, _count: { select: { materials: true } } } });
  return Boolean(lesson && (lesson.videoStatus === "READY" || lesson._count.materials > 0));
}

/** Video yoki material o'chirilgach dars bo'sh qolsa — o'quvchilarga bo'sh dars ko'rinmasligi uchun qoralamaga qaytaramiz. */
export async function unpublishIfEmpty(id: string) {
  if (!(await isLessonPublishable(id))) await db.lesson.updateMany({ where: { id, status: "PUBLISHED" }, data: { status: "DRAFT" } });
}

/**
 * "Hammasini nashr qilish": kurs, ichida nashrga tayyor darsi bor modullar va tayyor darslar.
 * Video ham, materiali ham yo'q darslar qoralamada qoladi — ularning soni qaytariladi.
 */
export async function publishCourseTree(courseId: string): Promise<{ skipped: number }> {
  const course = await getCourseTree(courseId);
  if (!course) throw new AppError("notFound");
  const ready = (l: { videoStatus: string; _count: { materials: number } }) => l.videoStatus === "READY" || l._count.materials > 0;
  const lessons = course.modules.flatMap((m) => m.lessons);
  await db.$transaction([
    db.lesson.updateMany({ where: { id: { in: lessons.filter(ready).map((l) => l.id) } }, data: { status: "PUBLISHED" } }),
    db.module.updateMany({ where: { id: { in: course.modules.filter((m) => m.lessons.some(ready)).map((m) => m.id) } }, data: { status: "PUBLISHED" } }),
    db.course.update({ where: { id: courseId }, data: { status: "PUBLISHED" } }),
  ]);
  return { skipped: lessons.filter((l) => !ready(l)).length };
}

/** Tashqi xizmatlardagi fayllarni (video, materiallar) tozalaydi — xato bo'lsa ham davom etadi. */
async function cleanupLessons(lessons: { videoId: string | null; materials: { storageKey: string }[] }[]) {
  await Promise.allSettled(
    lessons.flatMap((l) => [
      ...(l.videoId ? [deleteVideo(l.videoId)] : []),
      ...l.materials.map((m) => storage.delete(m.storageKey)),
    ]),
  );
}

const lessonFiles = { videoId: true, materials: { select: { storageKey: true } } } as const;

export async function deleteLesson(id: string) {
  const lesson = await db.lesson.findUnique({ where: { id }, select: { title: true, ...lessonFiles } });
  if (!lesson) throw new AppError("notFound");
  await db.lesson.delete({ where: { id } });
  await cleanupLessons([lesson]);
  return lesson;
}

export async function deleteModule(id: string) {
  const mod = await db.module.findUnique({
    where: { id },
    select: { title: true, lessons: { select: lessonFiles } },
  });
  if (!mod) throw new AppError("notFound");
  await db.module.delete({ where: { id } });
  await cleanupLessons(mod.lessons);
  return mod;
}

export async function deleteCourse(id: string) {
  const course = await db.course.findUnique({
    where: { id },
    select: { title: true, modules: { select: { lessons: { select: lessonFiles } } } },
  });
  if (!course) throw new AppError("notFound");
  await db.course.delete({ where: { id } });
  await cleanupLessons(course.modules.flatMap((m) => m.lessons));
  return course;
}

/**
 * Drag-and-drop tartibini saqlaydi. Yuborilgan id'lar aynan shu "ota"ga
 * tegishli ekani tekshiriladi — begona yozuvlarni o'zgartirib bo'lmaydi.
 */
export async function reorder(kind: "course" | "module" | "lesson", parentId: string | null, orderedIds: string[]) {
  if (new Set(orderedIds).size !== orderedIds.length) throw new AppError("invalid");
  if (kind === "course") {
    const count = await db.course.count({ where: { id: { in: orderedIds } } });
    if (count !== orderedIds.length) throw new AppError("invalid");
    await db.$transaction(orderedIds.map((id, i) => db.course.update({ where: { id }, data: { position: i } })));
  } else if (kind === "module") {
    const count = await db.module.count({ where: { id: { in: orderedIds }, courseId: parentId! } });
    if (!parentId || count !== orderedIds.length) throw new AppError("invalid");
    await db.$transaction(orderedIds.map((id, i) => db.module.update({ where: { id }, data: { position: i } })));
  } else {
    const count = await db.lesson.count({ where: { id: { in: orderedIds }, moduleId: parentId! } });
    if (!parentId || count !== orderedIds.length) throw new AppError("invalid");
    await db.$transaction(orderedIds.map((id, i) => db.lesson.update({ where: { id }, data: { position: i } })));
  }
}

export async function getCourseTree(id: string) {
  return db.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          lessons: {
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            select: { id: true, title: true, status: true, videoStatus: true, durationSec: true, _count: { select: { materials: true } } },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });
}
