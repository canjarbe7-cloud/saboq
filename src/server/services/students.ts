import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { generateTempPassword, hashPassword } from "@/server/auth/password";
import { clearLoginAttempts } from "@/server/auth/rate-limit";
import { destroyUserSessions } from "@/server/auth/session";

export type StudentInput = { name: string; phone: string; username: string; groupId?: string | null; note?: string | null };

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

async function getStudent(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user || user.role !== "STUDENT") throw new AppError("notFound");
  return user;
}

/** Yangi o'quvchi. Vaqtinchalik parol faqat shu yerda, bir marta qaytariladi. */
export async function createStudent(input: StudentInput) {
  const tempPassword = generateTempPassword();
  try {
    const user = await db.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        username: input.username,
        groupId: input.groupId || null,
        note: input.note || null,
        role: "STUDENT",
        passwordHash: await hashPassword(tempPassword),
        mustChangePassword: true,
      },
    });
    return { user, tempPassword };
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("usernameTaken");
    throw e;
  }
}

export async function updateStudent(id: string, input: StudentInput) {
  await getStudent(id);
  try {
    return await db.user.update({
      where: { id },
      data: {
        name: input.name,
        phone: input.phone,
        username: input.username,
        groupId: input.groupId || null,
        note: input.note || null,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("usernameTaken");
    throw e;
  }
}

/** Bloklanganda barcha sessiyalar darhol tugatiladi. */
export async function setStudentBlocked(id: string, blocked: boolean) {
  await getStudent(id);
  await db.user.update({ where: { id }, data: { status: blocked ? "BLOCKED" : "ACTIVE" } });
  if (blocked) await destroyUserSessions(id);
}

/** Yangi vaqtinchalik parol: eski sessiyalar tugaydi, login bloki yechiladi. */
export async function resetStudentPassword(id: string) {
  const user = await getStudent(id);
  const tempPassword = generateTempPassword();
  await db.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
  });
  await destroyUserSessions(id);
  await clearLoginAttempts(user.username);
  return { user, tempPassword };
}

export async function deleteStudent(id: string) {
  const user = await getStudent(id);
  await db.user.delete({ where: { id } });
  return user;
}

/** O'quvchiga ochiq kurslar ro'yxatini to'liq almashtiradi. */
export async function setEnrollments(userId: string, items: { courseId: string; expiresAt: Date | null }[]) {
  await getStudent(userId);
  // Sahifa ochiq turgan paytda o'chirilgan kurslar tashlab ketiladi — butun saqlash buzilmasin
  const existing = new Set(
    (await db.course.findMany({ where: { id: { in: items.map((i) => i.courseId) } }, select: { id: true } })).map((c) => c.id),
  );
  items = items.filter((i) => existing.has(i.courseId));
  const ids = items.map((i) => i.courseId);
  await db.$transaction([
    db.enrollment.deleteMany({ where: { userId, courseId: { notIn: ids } } }),
    ...items.map((i) =>
      db.enrollment.upsert({
        where: { userId_courseId: { userId, courseId: i.courseId } },
        create: { userId, courseId: i.courseId, expiresAt: i.expiresAt },
        update: { expiresAt: i.expiresAt },
      }),
    ),
  ]);
}

export async function revokeSession(userId: string, sessionId: string) {
  await db.session.deleteMany({ where: { id: sessionId, userId } });
}

export async function listStudents(params: { q?: string; groupId?: string; status?: "ACTIVE" | "BLOCKED"; page?: number }) {
  const take = 25;
  // URL'dan kelgan sahifa raqami: butun son, 1 dan kichik emas va juda katta emas (aks holda baza xato beradi)
  const page = Math.min(10_000, Math.max(1, Math.floor(params.page ?? 1) || 1));
  const q = params.q?.trim();
  const where: Prisma.UserWhereInput = {
    role: "STUDENT",
    ...(params.status ? { status: params.status } : {}),
    ...(params.groupId ? { groupId: params.groupId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { username: { contains: q.toLowerCase() } },
            { phone: { contains: q.replace(/\s/g, "") } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      select: {
        id: true, name: true, phone: true, username: true, status: true, mustChangePassword: true,
        lastLoginAt: true, createdAt: true,
        group: { select: { id: true, name: true } },
        enrollments: { select: { expiresAt: true } },
      },
    }),
    db.user.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / take)) };
}

/** O'quvchi sahifasi uchun to'liq ma'lumot: kurslar, progress, sessiyalar. */
export async function getStudentDetail(id: string) {
  const user = await db.user.findFirst({
    where: { id, role: "STUDENT" },
    select: {
      id: true, name: true, phone: true, username: true, status: true, note: true, groupId: true,
      mustChangePassword: true, lastLoginAt: true, createdAt: true,
      birthDate: true, gender: true, region: true, email: true, telegram: true,
      enrollments: { select: { courseId: true, expiresAt: true } },
      sessions: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { lastSeenAt: "desc" },
        select: { id: true, userAgent: true, ip: true, createdAt: true, lastSeenAt: true },
      },
    },
  });
  if (!user) return null;

  const courses = await db.course.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, title: true, section: true, status: true,
      modules: {
        where: { status: "PUBLISHED" },
        select: { lessons: { where: { status: "PUBLISHED" }, select: { id: true } } },
      },
    },
  });
  const done = await db.lessonProgress.findMany({
    where: { userId: id, completedAt: { not: null } },
    select: { lessonId: true },
  });
  const doneIds = new Set(done.map((d) => d.lessonId));

  return {
    user,
    courses: courses.map((c) => {
      const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const completed = lessonIds.filter((l) => doneIds.has(l)).length;
      return {
        id: c.id, title: c.title, section: c.section, status: c.status,
        total: lessonIds.length, completed,
        percent: lessonIds.length ? Math.round((completed / lessonIds.length) * 100) : 0,
      };
    }),
  };
}
