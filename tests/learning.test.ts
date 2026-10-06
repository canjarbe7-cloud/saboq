import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { attemptLogin } from "@/server/auth/login";
import { createSession, validateSession } from "@/server/auth/session";
import { getCourseForStudent, getLessonAccess, getLessonForStudent, getStreak, getStudentCourses, setLessonCompleted } from "@/server/services/learning";
import { resetStudentPassword, setEnrollments, setStudentBlocked } from "@/server/services/students";
import { reorder, updateLesson } from "@/server/services/courses";
import { detectMaterial } from "@/lib/file-types";
import { phoneSchema, slugify, usernameSchema } from "@/lib/validation";
import { makeUser, meta, resetDb } from "./helpers";

beforeEach(resetDb);

async function makeCourse(status: "DRAFT" | "PUBLISHED" = "PUBLISHED") {
  const course = await db.course.create({
    data: {
      title: "Listening", slug: `listening-${Math.random().toString(36).slice(2, 8)}`, section: "LISTENING", status,
      modules: {
        create: [
          { title: "M1", status: "PUBLISHED", position: 0, lessons: { create: [
            { title: "L1", status: "PUBLISHED", position: 0, videoStatus: "READY", videoId: "v1" },
            { title: "L2", status: "PUBLISHED", position: 1, videoStatus: "READY", videoId: "v2" },
            { title: "Qoralama", status: "DRAFT", position: 2 },
          ] } },
          { title: "Yashirin modul", status: "DRAFT", position: 1, lessons: { create: [{ title: "L3", status: "PUBLISHED", position: 0 }] } },
        ],
      },
    },
    include: { modules: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" } } } } },
  });
  const [l1, l2, draft] = course.modules[0].lessons;
  return { course, l1, l2, draft, hidden: course.modules[1].lessons[0] };
}

const student = (id: string) => ({ id, role: "STUDENT" as const });

describe("kursga kirish huquqi", () => {
  it("kurs ochilmagan o'quvchi darsni ko'ra olmaydi", async () => {
    const { user } = await makeUser();
    const { course, l1 } = await makeCourse();
    expect((await getLessonAccess(student(user.id), l1.id)).access).toBe("none");
    expect(await getLessonForStudent(user.id, l1.id)).toBeNull();
    expect(await getCourseForStudent(user.id, course.slug)).toBeNull();
    expect(await getStudentCourses(user.id)).toEqual([]);
  });

  it("kurs ochilgan o'quvchi faqat nashr qilingan darslarni ko'radi", async () => {
    const { user } = await makeUser();
    const { course, l1, draft, hidden } = await makeCourse();
    await setEnrollments(user.id, [{ courseId: course.id, expiresAt: null }]);

    expect((await getLessonAccess(student(user.id), l1.id)).access).toBe("ok");
    expect((await getLessonAccess(student(user.id), draft.id)).access).toBe("none");
    expect((await getLessonAccess(student(user.id), hidden.id)).access).toBe("none");

    const view = await getCourseForStudent(user.id, course.slug);
    expect(view?.total).toBe(2);
    expect(view?.modules.flatMap((m) => m.lessons.map((l) => l.title))).toEqual(["L1", "L2"]);
  });

  it("qoralama kurs yozilgan o'quvchiga ham ko'rinmaydi", async () => {
    const { user } = await makeUser();
    const { course, l1 } = await makeCourse("DRAFT");
    await setEnrollments(user.id, [{ courseId: course.id, expiresAt: null }]);
    expect((await getLessonAccess(student(user.id), l1.id)).access).toBe("none");
    expect(await getStudentCourses(user.id)).toEqual([]);
  });

  it("muddat tugaganda dars yopiladi, lekin kurs 'muddati tugagan' deb ko'rinadi", async () => {
    const { user } = await makeUser();
    const { course, l1 } = await makeCourse();
    await setEnrollments(user.id, [{ courseId: course.id, expiresAt: new Date(Date.now() - 1000) }]);

    expect((await getLessonAccess(student(user.id), l1.id)).access).toBe("expired");
    const lesson = await getLessonForStudent(user.id, l1.id);
    expect(lesson?.access).toBe("expired");
    expect(lesson && "lesson" in lesson).toBe(false);
    expect((await getStudentCourses(user.id))[0].access).toBe("expired");
  });

  it("boshqa o'quvchining kursi menga ochilmaydi; admin hammasini ko'radi", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const { course, l1, draft } = await makeCourse();
    await setEnrollments(a.user.id, [{ courseId: course.id, expiresAt: null }]);
    expect((await getLessonAccess(student(b.user.id), l1.id)).access).toBe("none");
    expect((await getLessonAccess({ id: "x", role: "ADMIN" }, draft.id)).access).toBe("ok");
  });

  it("kursni yopish (ro'yxatdan olib tashlash) kirishni bekor qiladi", async () => {
    const { user } = await makeUser();
    const { course, l1 } = await makeCourse();
    await setEnrollments(user.id, [{ courseId: course.id, expiresAt: null }]);
    await setEnrollments(user.id, []);
    expect((await getLessonAccess(student(user.id), l1.id)).access).toBe("none");
  });
});

describe("progress va yutuqlar", () => {
  it("foiz, 'davom ettirish' va nishonlar to'g'ri hisoblanadi", async () => {
    const { user } = await makeUser();
    const { course, l1, l2 } = await makeCourse();
    await setEnrollments(user.id, [{ courseId: course.id, expiresAt: null }]);

    expect(await setLessonCompleted(user.id, l1.id, course.id, true)).toEqual(["FIRST_LESSON"]);
    let [c] = await getStudentCourses(user.id);
    expect(c).toMatchObject({ percent: 50, completed: 1, total: 2 });
    expect(c.nextLesson?.id).toBe(l2.id);
    expect(await getStreak(user.id)).toBe(1);

    expect(await setLessonCompleted(user.id, l2.id, course.id, true)).toEqual(["COURSE_COMPLETE"]);
    [c] = await getStudentCourses(user.id);
    expect(c).toMatchObject({ percent: 100, nextLesson: null });
    // Nishon ikki marta berilmaydi
    expect(await setLessonCompleted(user.id, l2.id, course.id, true)).toEqual([]);
  });

  it("ketma-ket kunlar: bugun va kecha sanaladi, oraliq uzilsa to'xtaydi", async () => {
    const { user } = await makeUser();
    const day = (ago: number) => new Date(`${new Date(Date.now() + 5 * 3600_000 - ago * 86400_000).toISOString().slice(0, 10)}T00:00:00Z`);
    await db.activityDay.createMany({ data: [1, 2, 3, 5].map((ago) => ({ userId: user.id, day: day(ago) })) });
    expect(await getStreak(user.id)).toBe(3);
    await db.activityDay.create({ data: { userId: user.id, day: day(0) } });
    expect(await getStreak(user.id)).toBe(4);
  });
});

describe("admin xizmatlari", () => {
  it("parol tiklanganda sessiyalar tugaydi, eski parol ishlamaydi, yangisi majburiy almashtiriladi", async () => {
    const { user, password } = await makeUser({ username: "sardor" });
    const s = await createSession(user, meta());
    const { tempPassword } = await resetStudentPassword(user.id);

    expect(await validateSession(s.token)).toBeNull();
    expect(await attemptLogin({ username: "sardor", password }, meta())).toMatchObject({ ok: false });
    const res = await attemptLogin({ username: "sardor", password: tempPassword }, meta());
    expect(res).toMatchObject({ ok: true, user: { mustChangePassword: true } });
  });

  it("bloklanganda o'quvchi barcha qurilmalardan chiqariladi", async () => {
    const { user } = await makeUser();
    const s = await createSession(user, meta());
    await setStudentBlocked(user.id, true);
    expect(await db.session.count()).toBe(0);
    expect(await validateSession(s.token)).toBeNull();
  });

  it("tartiblashda begona id'lar rad etiladi", async () => {
    const a = await makeCourse();
    const b = await makeCourse();
    await expect(reorder("lesson", a.course.modules[0].id, [a.l1.id, b.l1.id])).rejects.toThrow();
    await reorder("lesson", a.course.modules[0].id, [a.l2.id, a.l1.id, a.draft.id]);
    const first = await db.lesson.findFirst({ where: { moduleId: a.course.modules[0].id }, orderBy: { position: "asc" } });
    expect(first?.id).toBe(a.l2.id);
  });

  it("videosi tayyor bo'lmagan darsni nashr qilib bo'lmaydi", async () => {
    const { draft } = await makeCourse();
    await expect(updateLesson(draft.id, { title: "Dars", description: "", status: "PUBLISHED" })).rejects.toMatchObject({ code: "lessonNoVideo" });
  });
});

describe("kiruvchi ma'lumotlarni tekshirish", () => {
  it("fayl turi nomiga emas, ichidagi baytlarga qarab aniqlanadi", () => {
    const bytes = (s: string) => new TextEncoder().encode(s.padEnd(16, "\0"));
    expect(detectMaterial(bytes("%PDF-1.7"))?.type).toBe("PDF");
    expect(detectMaterial(bytes("ID3\x03"))?.ext).toBe("mp3");
    expect(detectMaterial(bytes("RIFF\0\0\0\0WAVE"))?.ext).toBe("wav");
    expect(detectMaterial(bytes("MZ\x90\0"))).toBeNull(); // .exe
    expect(detectMaterial(bytes("<html><script>"))).toBeNull();
    expect(detectMaterial(bytes("PK\x03\x04"))).toBeNull(); // zip/docx
  });

  it("telefon, login va slug", () => {
    expect(phoneSchema.parse("90 123-45-67")).toBe("+998901234567");
    expect(phoneSchema.parse("+998 (90) 123 45 67")).toBe("+998901234567");
    expect(phoneSchema.safeParse("12345").success).toBe(false);
    expect(usernameSchema.parse(" Ali.Valiyev ")).toBe("ali.valiyev");
    expect(usernameSchema.safeParse("a b").success).toBe(false);
    expect(usernameSchema.safeParse("<script>").success).toBe(false);
    expect(slugify("IELTS Writing: Task 2 (o‘zbekcha)")).toBe("ielts-writing-task-2-ozbekcha");
  });
});
