import { db } from "@/server/db";
import { ACHIEVEMENTS, type AchievementCode } from "@/lib/achievements";
import { toDateInput } from "@/lib/format";

/**
 * O'quvchi kabineti uchun ma'lumotlar va ENG MUHIMI — kirish huquqi tekshiruvi.
 * O'quvchi faqat: nashr qilingan kurs + nashr qilingan modul + nashr qilingan dars
 * + o'ziga ochilgan va muddati tugamagan kursni ko'ra oladi.
 */

export type Access = "ok" | "expired" | "none";

const publishedLessons = {
  where: { status: "PUBLISHED" as const },
  orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }],
};
const publishedModules = {
  where: { status: "PUBLISHED" as const },
  orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }],
};

export function enrollmentAccess(enrollment: { expiresAt: Date | null } | null | undefined, now = new Date()): Access {
  if (!enrollment) return "none";
  return enrollment.expiresAt && enrollment.expiresAt <= now ? "expired" : "ok";
}

/** Foydalanuvchining shu darsga kirish huquqi. Admin har doim ko'ra oladi (qoralamalarni ham). */
export async function getLessonAccess(
  user: { id: string; role: "ADMIN" | "STUDENT" },
  lessonId: string,
): Promise<{ access: Access; lesson: { id: string; videoId: string | null; videoStatus: string; courseId: string } | null }> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true, status: true, videoId: true, videoStatus: true,
      module: { select: { status: true, course: { select: { id: true, status: true } } } },
    },
  });
  if (!lesson) return { access: "none", lesson: null };
  const info = { id: lesson.id, videoId: lesson.videoId, videoStatus: lesson.videoStatus, courseId: lesson.module.course.id };
  if (user.role === "ADMIN") return { access: "ok", lesson: info };

  const visible = lesson.status === "PUBLISHED" && lesson.module.status === "PUBLISHED" && lesson.module.course.status === "PUBLISHED";
  if (!visible) return { access: "none", lesson: null };

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: info.courseId } },
    select: { expiresAt: true },
  });
  const access = enrollmentAccess(enrollment);
  return { access, lesson: access === "none" ? null : info };
}

/** Kabinet bosh sahifasi: o'quvchiga ochilgan kurslar va ularning progressi. */
export async function getStudentCourses(userId: string) {
  const [enrollments, done] = await Promise.all([
    db.enrollment.findMany({
      where: { userId, course: { status: "PUBLISHED" } },
      orderBy: { course: { position: "asc" } },
      select: {
        expiresAt: true,
        course: {
          select: {
            id: true, title: true, slug: true, section: true, description: true,
            modules: { ...publishedModules, select: { lessons: { ...publishedLessons, select: { id: true, title: true, durationSec: true } } } },
          },
        },
      },
    }),
    db.lessonProgress.findMany({ where: { userId }, select: { lessonId: true, completedAt: true, updatedAt: true } }),
  ]);
  const completed = new Set(done.filter((d) => d.completedAt).map((d) => d.lessonId));
  const lastTouched = new Map(done.map((d) => [d.lessonId, d.updatedAt.getTime()]));

  return enrollments.map(({ expiresAt, course }) => {
    const lessons = course.modules.flatMap((m) => m.lessons);
    const doneCount = lessons.filter((l) => completed.has(l.id)).length;
    return {
      id: course.id, title: course.title, slug: course.slug, section: course.section, description: course.description,
      access: enrollmentAccess({ expiresAt }),
      expiresAt,
      total: lessons.length,
      completed: doneCount,
      percent: lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0,
      durationSec: lessons.reduce((n, l) => n + l.durationSec, 0),
      // "Davom ettirish": tugatilmagan birinchi dars
      nextLesson: lessons.find((l) => !completed.has(l.id)) ?? null,
      lastActivity: Math.max(0, ...lessons.map((l) => lastTouched.get(l.id) ?? 0)),
    };
  });
}

export async function getCourseForStudent(userId: string, slug: string) {
  const course = await db.course.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true, title: true, slug: true, section: true, description: true,
      enrollments: { where: { userId }, select: { expiresAt: true } },
      modules: {
        ...publishedModules,
        select: { id: true, title: true, lessons: { ...publishedLessons, select: { id: true, title: true, durationSec: true } } },
      },
    },
  });
  if (!course) return null;
  const access = enrollmentAccess(course.enrollments[0]);
  if (access === "none") return null;

  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progress = await db.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true, completedAt: true, positionSec: true },
  });
  const byId = new Map(progress.map((p) => [p.lessonId, p]));
  const completed = lessonIds.filter((id) => byId.get(id)?.completedAt).length;

  return {
    access,
    expiresAt: course.enrollments[0].expiresAt,
    id: course.id, title: course.title, slug: course.slug, section: course.section, description: course.description,
    total: lessonIds.length,
    completed,
    percent: lessonIds.length ? Math.round((completed / lessonIds.length) * 100) : 0,
    nextLessonId: lessonIds.find((id) => !byId.get(id)?.completedAt) ?? null,
    modules: course.modules.map((m) => ({
      id: m.id, title: m.title,
      lessons: m.lessons.map((l) => ({
        ...l,
        completed: Boolean(byId.get(l.id)?.completedAt),
        started: Boolean(byId.get(l.id)),
      })),
    })),
  };
}

export async function getLessonForStudent(userId: string, lessonId: string) {
  const { access, lesson: info } = await getLessonAccess({ id: userId, role: "STUDENT" }, lessonId);
  if (!info) return null;

  const course = await db.course.findUniqueOrThrow({
    where: { id: info.courseId },
    select: {
      title: true, slug: true,
      modules: { ...publishedModules, select: { title: true, lessons: { ...publishedLessons, select: { id: true, title: true, durationSec: true } } } },
    },
  });
  if (access === "expired") return { access, course: { title: course.title, slug: course.slug } } as const;

  const [lesson, progress, all] = await Promise.all([
    db.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      select: {
        id: true, title: true, description: true, durationSec: true, videoStatus: true,
        module: { select: { title: true } },
        materials: { orderBy: { position: "asc" }, select: { id: true, title: true, type: true, sizeBytes: true } },
      },
    }),
    db.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } }),
    db.lessonProgress.findMany({ where: { userId, completedAt: { not: null } }, select: { lessonId: true } }),
  ]);
  const completed = new Set(all.map((p) => p.lessonId));
  const flat = course.modules.flatMap((m) => m.lessons);
  const index = flat.findIndex((l) => l.id === lessonId);

  return {
    access,
    course: { title: course.title, slug: course.slug },
    lesson,
    positionSec: progress?.positionSec ?? 0,
    completed: Boolean(progress?.completedAt),
    prev: flat[index - 1] ?? null,
    next: flat[index + 1] ?? null,
    modules: course.modules.map((m) => ({
      title: m.title,
      lessons: m.lessons.map((l) => ({ ...l, completed: completed.has(l.id) })),
    })),
  } as const;
}

/* ───────────── Progress, ketma-ket kunlar, nishonlar ───────────── */

const dayOf = (date: Date) => new Date(`${toDateInput(date)}T00:00:00Z`);

async function touchActivity(userId: string, now = new Date()) {
  const day = dayOf(now);
  await db.activityDay.upsert({ where: { userId_day: { userId, day } }, create: { userId, day }, update: {} });
}

/** Video to'xtagan joyni saqlaydi (kirish huquqi chaqiruvchida tekshirilgan bo'lishi shart). */
export async function saveLessonPosition(userId: string, lessonId: string, positionSec: number) {
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, positionSec },
    update: { positionSec },
  });
  await touchActivity(userId);
}

/** Bugun yoki kecha bilan tugaydigan ketma-ket kunlar soni. */
export async function getStreak(userId: string, now = new Date()): Promise<number> {
  const days = await db.activityDay.findMany({ where: { userId }, orderBy: { day: "desc" }, take: 400, select: { day: true } });
  const set = new Set(days.map((d) => d.day.toISOString().slice(0, 10)));
  const cursor = dayOf(now);
  // Bugun hali dars qilmagan bo'lsa, kechagi kundan sanaymiz — seriya "yonib" turadi
  if (!set.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** "Darsni tugatdim" belgisi. Yangi olingan nishonlar kodini qaytaradi. */
export async function setLessonCompleted(userId: string, lessonId: string, courseId: string, completed: boolean): Promise<AchievementCode[]> {
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, completedAt: completed ? new Date() : null },
    update: { completedAt: completed ? new Date() : null },
  });
  if (!completed) return [];
  await touchActivity(userId);

  const [lessonsDone, streak, courseLessons, owned] = await Promise.all([
    db.lessonProgress.count({ where: { userId, completedAt: { not: null } } }),
    getStreak(userId),
    db.lesson.findMany({
      where: { status: "PUBLISHED", module: { status: "PUBLISHED", courseId } },
      select: { progress: { where: { userId, completedAt: { not: null } }, select: { id: true } } },
    }),
    db.userAchievement.findMany({ where: { userId }, select: { code: true } }),
  ]);
  const courseDone = courseLessons.length > 0 && courseLessons.every((l) => l.progress.length > 0);
  const have = new Set(owned.map((o) => o.code));

  const earned = ACHIEVEMENTS.filter((a) => {
    if (have.has(a.code)) return false;
    if (a.kind === "lessons") return lessonsDone >= a.threshold;
    if (a.kind === "streak") return streak >= a.threshold;
    return courseDone;
  }).map((a) => a.code);

  if (earned.length) {
    await db.userAchievement.createMany({ data: earned.map((code) => ({ userId, code })), skipDuplicates: true });
  }
  return earned;
}

/** Profildagi "Faollik" bo'limi: oxirgi `weeks` haftalik kalendar va umumiy raqamlar. */
export async function getActivityOverview(userId: string, weeks = 18, now = new Date()) {
  const today = dayOf(now);
  // Kalendar dushanbadan boshlanadi
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - ((today.getUTCDay() + 6) % 7) - (weeks - 1) * 7);

  const [recent, activeDays, completedLessons, streak] = await Promise.all([
    db.activityDay.findMany({ where: { userId, day: { gte: start } }, select: { day: true } }),
    db.activityDay.count({ where: { userId } }),
    db.lessonProgress.count({ where: { userId, completedAt: { not: null } } }),
    getStreak(userId, now),
  ]);
  const active = new Set(recent.map((d) => d.day.toISOString().slice(0, 10)));

  const days: { date: string; active: boolean; future: boolean }[] = [];
  for (const d = new Date(start); days.length < weeks * 7; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    days.push({ date, active: active.has(date), future: d > today });
  }
  return { days, activeDays, completedLessons, streak };
}
