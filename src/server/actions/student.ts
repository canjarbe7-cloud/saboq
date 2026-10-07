"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError } from "@/server/errors";
import { destroyUserSessions } from "@/server/auth/session";
import { getLessonAccess, setLessonCompleted } from "@/server/services/learning";
import { checkIn } from "@/server/services/attendance";
import { db } from "@/server/db";
import { idSchema, profileSchema } from "@/lib/validation";
import { studentAction } from "./helpers";

/** "Darsni tugatdim" / belgini olib tashlash. */
export const setLessonCompletedAction = studentAction(
  z.object({ lessonId: idSchema, completed: z.boolean() }),
  async ({ lessonId, completed }, ctx) => {
    const { access, lesson } = await getLessonAccess(ctx.user, lessonId);
    if (access !== "ok" || !lesson) throw new AppError("noAccess");
    const earned = await setLessonCompleted(ctx.user.id, lessonId, lesson.courseId, completed);
    revalidatePath("/kabinet", "layout");
    return { earned };
  },
);

/** Joriy qurilmadan tashqari barcha qurilmalardan chiqish. */
export const logoutOtherDevicesAction = studentAction(z.object({}), async (_input, ctx) => {
  await destroyUserSessions(ctx.user.id, ctx.sessionId);
  revalidatePath("/kabinet/profil");
});

/** Profildagi qo'shimcha ma'lumotlar. Faqat yuborilgan maydonlar yangilanadi; ism, telefon va login'ni admin o'zgartiradi. */
export const updateProfileAction = studentAction(profileSchema, async (input, ctx) => {
  const { birthDate, ...rest } = input;
  await db.user.update({
    where: { id: ctx.user.id },
    data: { ...rest, ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(`${birthDate}T00:00:00Z`) : null } : {}) },
  });
  revalidatePath("/kabinet/profil");
});

/** Davomat: ekrandagi QR koddan o'qilgan kod bilan "darsga keldim" deb belgilash. */
export const checkInAction = studentAction(z.object({ code: z.string().min(10).max(120) }), async ({ code }, ctx) => {
  const res = await checkIn(ctx.user.id, code);
  revalidatePath("/kabinet/davomat");
  return { title: res.title, markedAt: res.markedAt.toISOString(), already: res.already };
});
