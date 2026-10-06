import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ruxsatlar testi: Server Action'lar va himoya funksiyalari rolni SERVER tomonida
 * tekshirishini isbotlaydi. Next.js'ning cookie/redirect qismlari soxtalashtirilgan.
 */
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
  headers: async () => new Headers({ "x-real-ip": "10.1.1.1", "user-agent": "vitest" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));

import { db } from "@/server/db";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { createSession } from "@/server/auth/session";
import { ApiError, requireAdmin, requireApiUser, requireStudent, requireUser } from "@/server/auth/guards";
import { createStudentAction, reorderAction, resetStudentPasswordAction, setStudentBlockedAction } from "@/server/actions/admin";
import { setLessonCompletedAction } from "@/server/actions/student";
import { changePasswordAction } from "@/server/actions/auth";
import { makeUser, meta, resetDb } from "./helpers";

async function loginAs(opts: Parameters<typeof makeUser>[0] = {}) {
  const made = await makeUser(opts);
  const { token } = await createSession(made.user, meta());
  cookieJar.set(SESSION_COOKIE, token);
  return made;
}

const req = (method = "GET", headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/x", { method, headers: { host: "localhost:3000", ...headers } });

beforeEach(async () => {
  cookieJar.clear();
  await resetDb();
});

describe("sahifa himoyasi", () => {
  it("mehmon login sahifasiga yo'naltiriladi", async () => {
    await expect(requireUser()).rejects.toThrow("REDIRECT:/kirish");
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/kirish");
  });

  it("o'quvchi admin panelga kira olmaydi, admin esa kabinetga", async () => {
    await loginAs({ role: "STUDENT" });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/kabinet");
    cookieJar.clear();
    await loginAs({ role: "ADMIN" });
    await expect(requireStudent()).rejects.toThrow("REDIRECT:/admin");
    expect((await requireAdmin()).user.role).toBe("ADMIN");
  });

  it("vaqtinchalik parolli foydalanuvchi parolni o'zgartirmaguncha hech qayerga kira olmaydi", async () => {
    await loginAs({ mustChangePassword: true });
    await expect(requireStudent()).rejects.toThrow("REDIRECT:/parol-yangilash");
    expect((await requireUser({ allowMustChangePassword: true })).user.mustChangePassword).toBe(true);
  });
});

describe("Server Action'lar", () => {
  const input = { name: "Yangi Oquvchi", phone: "901234567", username: "yangi.oquvchi" };

  it("o'quvchi admin amalini chaqira olmaydi — bazada hech narsa o'zgarmaydi", async () => {
    const { user } = await loginAs({ role: "STUDENT" });
    await expect(createStudentAction(input)).rejects.toThrow("REDIRECT:/kabinet");
    await expect(setStudentBlockedAction({ id: user.id, blocked: false })).rejects.toThrow("REDIRECT");
    await expect(resetStudentPasswordAction({ id: user.id })).rejects.toThrow("REDIRECT");
    await expect(reorderAction({ kind: "course", parentId: null, ids: ["abc"] })).rejects.toThrow("REDIRECT");
    expect(await db.user.count()).toBe(1);
    expect(await db.auditLog.count()).toBe(0);
  });

  it("mehmon ham chaqira olmaydi", async () => {
    await expect(createStudentAction(input)).rejects.toThrow("REDIRECT:/kirish");
    await expect(setLessonCompletedAction({ lessonId: "abc", completed: true })).rejects.toThrow("REDIRECT:/kirish");
  });

  it("admin o'quvchi yaratadi: vaqtinchalik parol, telefon normallashadi, jurnalga yoziladi", async () => {
    await loginAs({ role: "ADMIN" });
    const res = await createStudentAction(input);
    if (!res.ok) throw new Error(res.error);
    const created = await db.user.findUniqueOrThrow({ where: { id: res.data.id } });
    expect(created).toMatchObject({ role: "STUDENT", phone: "+998901234567", mustChangePassword: true });
    expect(created.passwordHash).not.toContain(res.data.tempPassword);

    const log = await db.auditLog.findFirstOrThrow({ where: { action: "student.create" } });
    expect(JSON.stringify(log.details)).not.toContain(res.data.tempPassword);
  });

  it("noto'g'ri ma'lumot Zod tekshiruvidan o'tmaydi", async () => {
    await loginAs({ role: "ADMIN" });
    expect(await createStudentAction({ ...input, phone: "123" })).toEqual({ ok: false, error: "phone" });
    expect(await createStudentAction({ ...input, username: "A B" })).toEqual({ ok: false, error: "username" });
    // @ts-expect-error — ataylab noto'g'ri tur
    expect(await setStudentBlockedAction({ id: { $ne: "" }, blocked: true })).toEqual({ ok: false, error: "invalid" });
    await createStudentAction(input);
    expect(await createStudentAction(input)).toEqual({ ok: false, error: "usernameTaken" });
  });

  it("admin amali orqali admin akkauntini bloklab yoki parolini tiklab bo'lmaydi", async () => {
    const { user: admin } = await loginAs({ role: "ADMIN" });
    expect(await setStudentBlockedAction({ id: admin.id, blocked: true })).toEqual({ ok: false, error: "notFound" });
    expect(await resetStudentPasswordAction({ id: admin.id })).toEqual({ ok: false, error: "notFound" });
  });

  it("parol o'zgartirish: joriy sessiya qoladi, boshqalari tugaydi", async () => {
    const { user, password } = await loginAs({ mustChangePassword: true });
    await createSession(user, meta(2));
    const form = new FormData();
    form.set("currentPassword", password);
    form.set("newPassword", "YangiParol2024");
    form.set("confirmPassword", "YangiParol2024");
    form.set("mode", "profile");
    expect(await changePasswordAction(null, form)).toEqual({ success: "passwordChanged" });
    expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
    expect((await requireStudent()).user.mustChangePassword).toBe(false);
  });
});

describe("API himoyasi", () => {
  it("sessiyasiz so'rov 401, noto'g'ri rol 403 oladi", async () => {
    await expect(requireApiUser(req())).rejects.toMatchObject({ status: 401 });
    await loginAs({ role: "STUDENT" });
    await expect(requireApiUser(req(), "ADMIN")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect((await requireApiUser(req(), "STUDENT")).user.role).toBe("STUDENT");
  });

  it("boshqa saytdan kelgan POST so'rov rad etiladi (CSRF)", async () => {
    await loginAs({ role: "ADMIN" });
    await expect(requireApiUser(req("POST", { origin: "https://yomon-sayt.example" }), "ADMIN")).rejects.toBeInstanceOf(ApiError);
    await expect(requireApiUser(req("POST"), "ADMIN")).rejects.toMatchObject({ code: "BAD_ORIGIN" });
    expect((await requireApiUser(req("POST", { origin: "http://localhost:3000" }), "ADMIN")).user.role).toBe("ADMIN");
  });
});
