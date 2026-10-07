"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { adminAction } from "./helpers";
import { idSchema, nameSchema, phoneSchema, SECTIONS, titleSchema, usernameSchema } from "@/lib/validation";
import * as students from "@/server/services/students";
import * as courses from "@/server/services/courses";
import * as attendance from "@/server/services/attendance";
import { saveSiteContent } from "@/server/services/site-content";
import { contentUpdateSchema } from "@/lib/site-content";
import { destroyUserSessions } from "@/server/auth/session";
import { createVideo, deleteVideo, getVideoState, signTusUpload } from "@/server/video/bunny";
import { isLocalVideoId } from "@/server/video/local";
import { storage } from "@/server/storage";

const publishStatus = z.enum(["DRAFT", "PUBLISHED"]);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

/* ───────────── O'quvchilar ───────────── */

const studentSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  username: usernameSchema,
  groupId: idSchema.nullish(),
  note: optionalText(500),
});

export const createStudentAction = adminAction(studentSchema, async (input, ctx) => {
  const { user, tempPassword } = await students.createStudent(input);
  await ctx.audit("student.create", user.id, { username: user.username, name: user.name });
  // Vaqtinchalik parol faqat shu javobda, bir marta ko'rsatiladi
  return { id: user.id, username: user.username, tempPassword };
});

export const updateStudentAction = adminAction(studentSchema.extend({ id: idSchema }), async ({ id, ...input }, ctx) => {
  await students.updateStudent(id, input);
  await ctx.audit("student.update", id, { username: input.username, name: input.name });
});

export const setStudentBlockedAction = adminAction(
  z.object({ id: idSchema, blocked: z.boolean() }),
  async ({ id, blocked }, ctx) => {
    await students.setStudentBlocked(id, blocked);
    await ctx.audit(blocked ? "student.block" : "student.unblock", id);
  },
);

export const resetStudentPasswordAction = adminAction(z.object({ id: idSchema }), async ({ id }, ctx) => {
  const { user, tempPassword } = await students.resetStudentPassword(id);
  await ctx.audit("student.resetPassword", id, { username: user.username });
  return { username: user.username, tempPassword };
});

export const deleteStudentAction = adminAction(z.object({ id: idSchema }), async ({ id }, ctx) => {
  const user = await students.deleteStudent(id);
  await ctx.audit("student.delete", id, { username: user.username, name: user.name });
});

export const setEnrollmentsAction = adminAction(
  z.object({
    userId: idSchema,
    items: z
      .array(z.object({ courseId: idSchema, expiresAt: z.iso.date().nullable() }))
      .max(200),
  }),
  async ({ userId, items }, ctx) => {
    await students.setEnrollments(
      userId,
      // Tanlangan kunning oxirigacha (Toshkent vaqti bilan) amal qiladi
      items.map((i) => ({ courseId: i.courseId, expiresAt: i.expiresAt ? new Date(`${i.expiresAt}T23:59:59+05:00`) : null })),
    );
    await ctx.audit("student.enrollments", userId, { courses: items.length });
  },
);

export const revokeSessionAction = adminAction(
  z.object({ userId: idSchema, sessionId: idSchema.optional() }),
  async ({ userId, sessionId }, ctx) => {
    if (sessionId) await students.revokeSession(userId, sessionId);
    else await destroyUserSessions(userId);
    await ctx.audit("student.revokeSession", userId, { all: !sessionId });
  },
);

/* ───────────── Guruhlar ───────────── */

export const saveGroupAction = adminAction(
  z.object({ id: idSchema.optional(), name: z.string().trim().min(1).max(60), note: optionalText(300) }),
  async ({ id, name, note }, ctx) => {
    const clash = await db.group.findFirst({ where: { name, ...(id ? { id: { not: id } } : {}) } });
    if (clash) throw new AppError("groupExists");
    const group = id
      ? await db.group.update({ where: { id }, data: { name, note } })
      : await db.group.create({ data: { name, note } });
    await ctx.audit(id ? "group.update" : "group.create", group.id, { name });
  },
);

export const deleteGroupAction = adminAction(z.object({ id: idSchema }), async ({ id }, ctx) => {
  const group = await db.group.delete({ where: { id } }).catch(() => null);
  if (!group) throw new AppError("notFound");
  await ctx.audit("group.delete", id, { name: group.name });
});

/* ───────────── Kurslar, modullar, darslar ───────────── */

const courseSchema = z.object({
  title: titleSchema,
  section: z.enum(SECTIONS),
  description: z.string().trim().max(2000).default(""),
});

export const createCourseAction = adminAction(courseSchema, async (input, ctx) => {
  const course = await courses.createCourse(input);
  await ctx.audit("course.create", course.id, { title: course.title });
  return { id: course.id };
});

export const updateCourseAction = adminAction(
  courseSchema.extend({ id: idSchema, status: publishStatus }),
  async ({ id, ...input }, ctx) => {
    await courses.updateCourse(id, input);
    await ctx.audit("course.update", id, { title: input.title, status: input.status });
  },
);

export const deleteCourseAction = adminAction(z.object({ id: idSchema }), async ({ id }, ctx) => {
  const course = await courses.deleteCourse(id);
  await ctx.audit("course.delete", id, { title: course.title });
});

export const createModuleAction = adminAction(
  z.object({ courseId: idSchema, title: titleSchema }),
  async ({ courseId, title }, ctx) => {
    const mod = await courses.createModule(courseId, title);
    await ctx.audit("module.create", mod.id, { title });
  },
);

export const updateModuleAction = adminAction(
  z.object({ id: idSchema, title: titleSchema, status: publishStatus }),
  async ({ id, ...input }, ctx) => {
    await courses.updateModule(id, input);
    await ctx.audit("module.update", id, input);
  },
);

export const deleteModuleAction = adminAction(z.object({ id: idSchema }), async ({ id }, ctx) => {
  const mod = await courses.deleteModule(id);
  await ctx.audit("module.delete", id, { title: mod.title });
});

export const createLessonAction = adminAction(
  z.object({ moduleId: idSchema, title: titleSchema }),
  async ({ moduleId, title }, ctx) => {
    const lesson = await courses.createLesson(moduleId, title);
    await ctx.audit("lesson.create", lesson.id, { title });
    return { id: lesson.id };
  },
);

export const updateLessonAction = adminAction(
  z.object({
    id: idSchema,
    title: titleSchema,
    description: z.string().trim().max(5000).default(""),
    status: publishStatus,
  }),
  async ({ id, ...input }, ctx) => {
    await courses.updateLesson(id, input);
    await ctx.audit("lesson.update", id, { title: input.title, status: input.status });
  },
);

export const deleteLessonAction = adminAction(z.object({ id: idSchema }), async ({ id }, ctx) => {
  const lesson = await courses.deleteLesson(id);
  await ctx.audit("lesson.delete", id, { title: lesson.title });
});

export const reorderAction = adminAction(
  z.object({
    kind: z.enum(["course", "module", "lesson"]),
    parentId: idSchema.nullable(),
    ids: z.array(idSchema).min(1).max(500),
  }),
  async ({ kind, parentId, ids }, ctx) => {
    await courses.reorder(kind, parentId, ids);
    await ctx.audit(`${kind}.reorder`, parentId);
  },
);

/* ───────────── Video ───────────── */

/**
 * Yuklashni boshlaydi (yoki uzilgan yuklashni davom ettiradi): video xizmatida
 * joy ochadi va brauzerga to'g'ridan-to'g'ri yuklash uchun imzo qaytaradi.
 */
export const startVideoUploadAction = adminAction(z.object({ lessonId: idSchema }), async ({ lessonId }, ctx) => {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new AppError("notFound");

  let videoId = lesson.videoId;
  if (!videoId || lesson.videoStatus !== "UPLOADING") {
    if (videoId) await deleteVideo(videoId);
    videoId = await createVideo(lesson.title);
    // Yangi video yuklanayotganda dars vaqtincha qoralamaga qaytadi
    await db.lesson.update({
      where: { id: lessonId },
      data: { videoId, videoStatus: "UPLOADING", durationSec: 0, status: "DRAFT" },
    });
    await ctx.audit("lesson.videoUpload", lessonId, { title: lesson.title });
  }
  return signTusUpload(videoId);
});

export const finishVideoUploadAction = adminAction(z.object({ lessonId: idSchema }), async ({ lessonId }) => {
  await db.lesson.updateMany({
    where: { id: lessonId, videoStatus: "UPLOADING" },
    data: { videoStatus: "PROCESSING" },
  });
});

/** Video xizmatidan holatni so'raydi (qayta ishlash tugadimi?). */
export const refreshVideoStatusAction = adminAction(z.object({ lessonId: idSchema }), async ({ lessonId }) => {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson?.videoId) throw new AppError("notFound");
  if (isLocalVideoId(lesson.videoId)) return { videoStatus: lesson.videoStatus, durationSec: lesson.durationSec };
  const remote = await getVideoState(lesson.videoId);
  // Brauzer hali yuklayotgan bo'lsa, holatni o'zgartirmaymiz
  const videoStatus = lesson.videoStatus === "UPLOADING" && remote.state === "UPLOADING" ? "UPLOADING" : remote.state === "UPLOADING" ? "PROCESSING" : remote.state;
  await db.lesson.update({ where: { id: lessonId }, data: { videoStatus, durationSec: remote.durationSec } });
  return { videoStatus, durationSec: remote.durationSec };
});

export const removeVideoAction = adminAction(z.object({ lessonId: idSchema }), async ({ lessonId }, ctx) => {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new AppError("notFound");
  if (lesson.videoId) await deleteVideo(lesson.videoId);
  await db.lesson.update({ where: { id: lessonId }, data: { videoId: null, videoStatus: "NONE", durationSec: 0 } });
  await courses.unpublishIfEmpty(lessonId);
  await ctx.audit("lesson.videoRemove", lessonId, { title: lesson.title });
});

/* ───────────── Materiallar ───────────── */

export const deleteMaterialAction = adminAction(z.object({ id: idSchema }), async ({ id }, ctx) => {
  const material = await db.material.delete({ where: { id } }).catch(() => null);
  if (!material) throw new AppError("notFound");
  await storage.delete(material.storageKey).catch(() => undefined);
  await courses.unpublishIfEmpty(material.lessonId);
  await ctx.audit("material.delete", material.lessonId, { title: material.title });
});

/* ───────────── Arizalar ───────────── */

export const updateApplicationAction = adminAction(
  z.object({ id: idSchema, status: z.enum(["NEW", "CONTACTED", "CLOSED"]), note: optionalText(500) }),
  async ({ id, status, note }, ctx) => {
    const app = await db.application.update({ where: { id }, data: { status, note } }).catch(() => null);
    if (!app) throw new AppError("notFound");
    await ctx.audit("application.update", id, { status });
  },
);

export const deleteApplicationAction = adminAction(z.object({ id: idSchema }), async ({ id }, ctx) => {
  const app = await db.application.delete({ where: { id } }).catch(() => null);
  if (!app) throw new AppError("notFound");
  await ctx.audit("application.delete", id, { name: app.name });
});

/** Kursni o'quvchilarga ko'rinadigan qilish: kurs + modullar + nashrga tayyor darslar. */
export const publishCourseTreeAction = adminAction(z.object({ courseId: idSchema }), async ({ courseId }, ctx) => {
  const result = await courses.publishCourseTree(courseId);
  await ctx.audit("course.publishAll", courseId, result);
  return result;
});

/* ───────────── Davomat ───────────── */

export const startAttendanceAction = adminAction(z.object({ groupId: idSchema.nullable() }), async ({ groupId }, ctx) => {
  const session = await attendance.startSession(groupId);
  await ctx.audit("attendance.start", session.id, { title: session.title });
  return { id: session.id };
});

export const closeAttendanceAction = adminAction(z.object({ id: idSchema }), async ({ id }, ctx) => {
  const session = await attendance.closeSession(id);
  await ctx.audit("attendance.close", id, { title: session.title });
});

export const deleteAttendanceAction = adminAction(z.object({ id: idSchema }), async ({ id }, ctx) => {
  const session = await attendance.deleteSession(id);
  await ctx.audit("attendance.delete", id, { title: session.title });
});

/** Qo'lda Bor/Yo'q qilish. Jurnalga yozilmaydi — bir darsda o'nlab marta bosiladi. */
export const setAttendanceAction = adminAction(
  z.object({ sessionId: idSchema, userId: idSchema, present: z.boolean() }),
  async ({ sessionId, userId, present }) => {
    await attendance.setManual(sessionId, userId, present ? "PRESENT" : "ABSENT");
  },
);

/* ───────────── Sayt kontenti ───────────── */

/** Bosh sahifa bo'limlaridan birini (ustozlar, natijalar, fikrlar, FAQ, raqamlar, aloqa) saqlaydi. */
export const saveSiteContentAction = adminAction(contentUpdateSchema, async (input, ctx) => {
  await saveSiteContent(input.key, input.value);
  // Ochiq sahifalar ham yangilansin (admin sahifalarini qolip o'zi yangilaydi)
  revalidatePath("/", "layout");
  await ctx.audit("content.update", input.key);
});
