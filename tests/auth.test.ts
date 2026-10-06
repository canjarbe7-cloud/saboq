import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { attemptLogin, changePassword } from "@/server/auth/login";
import { createSession, hashToken, validateSession } from "@/server/auth/session";
import { generateTempPassword, verifyPassword } from "@/server/auth/password";
import { clearLoginAttempts, consumeRateLimit } from "@/server/auth/rate-limit";
import { checkPassword } from "@/lib/password-policy";
import { makeUser, meta, resetDb } from "./helpers";

beforeEach(resetDb);

describe("login", () => {
  it("to'g'ri login va parol bilan sessiya ochadi", async () => {
    const { user, password } = await makeUser({ username: "ali" });
    const res = await attemptLogin({ username: "  ALI ", password }, meta());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const active = await validateSession(res.token);
    expect(active?.user.id).toBe(user.id);
  });

  it("parol bazada ochiq saqlanmaydi, token esa faqat hash ko'rinishida", async () => {
    const { user, password } = await makeUser();
    expect(user.passwordHash).not.toContain(password);
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    const res = await attemptLogin({ username: user.username, password }, meta());
    if (!res.ok) throw new Error("login failed");
    const s = await db.session.findFirstOrThrow();
    expect(s.tokenHash).toBe(hashToken(res.token));
    expect(s.tokenHash).not.toBe(res.token);
  });

  it("noto'g'ri parol va mavjud bo'lmagan login bir xil xato qaytaradi", async () => {
    const { user } = await makeUser();
    const a = await attemptLogin({ username: user.username, password: "xato-parol1" }, meta());
    const b = await attemptLogin({ username: "yoq-bunday", password: "xato-parol1" }, meta());
    expect(a).toEqual({ ok: false, code: "INVALID", attemptsLeft: 4 });
    expect(b).toEqual({ ok: false, code: "INVALID", attemptsLeft: 4 });
  });

  it("5 ta xato urinishdan keyin vaqtincha bloklaydi — to'g'ri parol ham o'tmaydi", async () => {
    const { user, password } = await makeUser();
    for (let i = 0; i < 4; i++) {
      const r = await attemptLogin({ username: user.username, password: "xato" }, meta());
      expect(r).toMatchObject({ code: "INVALID" });
    }
    const fifth = await attemptLogin({ username: user.username, password: "xato" }, meta());
    expect(fifth).toMatchObject({ ok: false, code: "LOCKED" });

    const good = await attemptLogin({ username: user.username, password }, meta(2));
    expect(good).toMatchObject({ ok: false, code: "LOCKED" });
    expect(await db.session.count()).toBe(0);
  });

  it("blok 15 daqiqadan keyin yechiladi", async () => {
    const { user, password } = await makeUser();
    for (let i = 0; i < 5; i++) await attemptLogin({ username: user.username, password: "xato" }, meta());
    await db.loginAttempt.updateMany({ data: { createdAt: new Date(Date.now() - 16 * 60_000) } });
    const res = await attemptLogin({ username: user.username, password }, meta());
    expect(res.ok).toBe(true);
  });

  it("admin blokni yecha oladi (parol tiklanganda)", async () => {
    const { user, password } = await makeUser();
    for (let i = 0; i < 5; i++) await attemptLogin({ username: user.username, password: "xato" }, meta());
    await clearLoginAttempts(user.username);
    expect((await attemptLogin({ username: user.username, password }, meta())).ok).toBe(true);
  });

  it("muvaffaqiyatli kirish xato urinishlar hisobini nolga tushiradi", async () => {
    const { user, password } = await makeUser();
    for (let i = 0; i < 3; i++) await attemptLogin({ username: user.username, password: "xato" }, meta());
    expect((await attemptLogin({ username: user.username, password }, meta())).ok).toBe(true);
    const r = await attemptLogin({ username: user.username, password: "xato" }, meta());
    expect(r).toEqual({ ok: false, code: "INVALID", attemptsLeft: 4 });
  });

  it("bitta IP'dan juda ko'p xato urinish bo'lsa, IP cheklanadi", async () => {
    const { user, password } = await makeUser();
    await db.loginAttempt.createMany({
      data: Array.from({ length: 30 }, (_, i) => ({ username: `u${i}`, ip: "10.0.0.9", success: false })),
    });
    const res = await attemptLogin({ username: user.username, password }, meta(9));
    expect(res).toEqual({ ok: false, code: "RATE_LIMITED" });
  });

  it("bloklangan o'quvchi kira olmaydi va mavjud sessiyasi ham ishlamaydi", async () => {
    const { user, password } = await makeUser();
    const first = await attemptLogin({ username: user.username, password }, meta());
    if (!first.ok) throw new Error("login failed");
    await db.user.update({ where: { id: user.id }, data: { status: "BLOCKED" } });

    expect(await validateSession(first.token)).toBeNull();
    expect(await attemptLogin({ username: user.username, password }, meta())).toEqual({ ok: false, code: "BLOCKED" });
  });
});

describe("sessiya limiti", () => {
  it("3-qurilma kirganda eng eski sessiya chiqarib yuboriladi", async () => {
    const { user } = await makeUser();
    const s1 = await createSession(user, meta(1));
    await db.session.updateMany({ data: { lastSeenAt: new Date(Date.now() - 60_000) } });
    const s2 = await createSession(user, meta(2));
    const s3 = await createSession(user, meta(3));

    expect(await db.session.count({ where: { userId: user.id } })).toBe(2);
    expect(await validateSession(s1.token)).toBeNull();
    expect(await validateSession(s2.token)).not.toBeNull();
    expect(await validateSession(s3.token)).not.toBeNull();
  });

  it("bir vaqtning o'zida ko'p login bo'lsa ham limit buzilmaydi", async () => {
    const { user } = await makeUser();
    await Promise.all(Array.from({ length: 6 }, (_, i) => createSession(user, meta(i))));
    expect(await db.session.count({ where: { userId: user.id } })).toBe(2);
  });

  it("limit har bir o'quvchi uchun alohida", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await createSession(a.user, meta(1));
    await createSession(a.user, meta(2));
    await createSession(b.user, meta(3));
    expect(await db.session.count()).toBe(3);
  });

  it("muddati o'tgan yoki soxta token rad etiladi", async () => {
    const { user } = await makeUser();
    const s = await createSession(user, meta());
    expect(await validateSession("soxta-token")).toBeNull();
    expect(await validateSession(undefined)).toBeNull();
    await db.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSession(s.token)).toBeNull();
    expect(await db.session.count()).toBe(0);
  });
});

describe("parol o'zgartirish", () => {
  async function setup() {
    const { user, password } = await makeUser({ username: "vali", mustChangePassword: true });
    const current = await createSession(user, meta(1));
    const other = await createSession(user, meta(2));
    const currentRow = await db.session.findUniqueOrThrow({ where: { tokenHash: hashToken(current.token) } });
    return { user, password, current, other, currentSessionId: currentRow.id };
  }

  it("eski parol xato bo'lsa rad etadi", async () => {
    const { user, currentSessionId } = await setup();
    const res = await changePassword({
      userId: user.id, currentSessionId, currentPassword: "notogri1", newPassword: "YangiParol2024",
    });
    expect(res).toEqual({ ok: false, code: "WRONG_CURRENT" });
  });

  it("zaif yoki eski parol bilan bir xil yangi parolni rad etadi", async () => {
    const { user, password, currentSessionId } = await setup();
    const base = { userId: user.id, currentSessionId, currentPassword: password };
    expect(await changePassword({ ...base, newPassword: "qisqa1" })).toMatchObject({ code: "WEAK" });
    expect(await changePassword({ ...base, newPassword: "faqatharflar" })).toMatchObject({ code: "WEAK" });
    expect(await changePassword({ ...base, newPassword: "vali12345" })).toMatchObject({ code: "WEAK" });
    expect(await changePassword({ ...base, newPassword: password })).toEqual({ ok: false, code: "SAME_AS_OLD" });
  });

  it("muvaffaqiyatli o'zgarganda boshqa barcha sessiyalar tugaydi, joriysi qoladi", async () => {
    const { user, password, current, other, currentSessionId } = await setup();
    const res = await changePassword({
      userId: user.id, currentSessionId, currentPassword: password, newPassword: "YangiParol2024",
    });
    expect(res).toEqual({ ok: true });

    expect(await validateSession(current.token)).not.toBeNull();
    expect(await validateSession(other.token)).toBeNull();

    const fresh = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.mustChangePassword).toBe(false);
    expect(await verifyPassword(fresh.passwordHash, "YangiParol2024")).toBe(true);
    expect(await verifyPassword(fresh.passwordHash, password)).toBe(false);
  });
});

describe("yordamchi funksiyalar", () => {
  it("vaqtinchalik parol har doim parol qoidalariga mos", () => {
    for (let i = 0; i < 200; i++) expect(checkPassword(generateTempPassword())).toEqual([]);
  });

  it("umumiy rate-limit limitdan oshganda false qaytaradi", async () => {
    for (let i = 0; i < 3; i++) expect(await consumeRateLimit("k", 3, 60)).toBe(true);
    expect(await consumeRateLimit("k", 3, 60)).toBe(false);
    await db.rateLimit.updateMany({ data: { windowStart: new Date(Date.now() - 61_000) } });
    expect(await consumeRateLimit("k", 3, 60)).toBe(true);
  });
});
