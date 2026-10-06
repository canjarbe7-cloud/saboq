import { db } from "@/server/db";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import {
  LOGIN_MAX_FAILURES,
  getUsernameLock,
  isIpBlocked,
  recordLoginAttempt,
} from "./rate-limit";
import { createSession, destroyUserSessions, type SessionMeta } from "./session";
import { checkPassword, type PasswordIssue } from "@/lib/password-policy";

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; user: { id: string; role: "ADMIN" | "STUDENT"; mustChangePassword: boolean } }
  | { ok: false; code: "INVALID"; attemptsLeft: number }
  | { ok: false; code: "LOCKED"; retryAfterMin: number }
  | { ok: false; code: "RATE_LIMITED" }
  | { ok: false; code: "BLOCKED" };

export const normalizeUsername = (u: string) => u.trim().toLowerCase();

/**
 * Login va parolni tekshiradi, muvaffaqiyatli bo'lsa sessiya ochadi.
 * Login mavjud yoki yo'qligi javobdan bilinmaydi: ikkala holatda ham bir xil xato.
 */
export async function attemptLogin(
  input: { username: string; password: string },
  meta: SessionMeta & { ip: string },
): Promise<LoginResult> {
  const username = normalizeUsername(input.username);

  if (await isIpBlocked(meta.ip)) return { ok: false, code: "RATE_LIMITED" };

  const lock = await getUsernameLock(username);
  if (lock.locked) return { ok: false, code: "LOCKED", retryAfterMin: lock.retryAfterMin };

  const user = await db.user.findUnique({ where: { username } });
  const valid = user ? await verifyPassword(user.passwordHash, input.password) : false;
  if (!user) await burnPasswordCheck(input.password);

  if (!user || !valid) {
    await recordLoginAttempt(username, meta.ip, false);
    const failures = lock.failures + 1;
    if (failures >= LOGIN_MAX_FAILURES) {
      const after = await getUsernameLock(username);
      return { ok: false, code: "LOCKED", retryAfterMin: after.locked ? after.retryAfterMin : 1 };
    }
    return { ok: false, code: "INVALID", attemptsLeft: LOGIN_MAX_FAILURES - failures };
  }

  // Bloklangani faqat to'g'ri parol kiritilgandagina aytiladi.
  if (user.status !== "ACTIVE") return { ok: false, code: "BLOCKED" };

  await recordLoginAttempt(username, meta.ip, true);
  const { token, expiresAt } = await createSession(user, meta);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    ok: true,
    token,
    expiresAt,
    user: { id: user.id, role: user.role, mustChangePassword: user.mustChangePassword },
  };
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; code: "WRONG_CURRENT" }
  | { ok: false; code: "SAME_AS_OLD" }
  | { ok: false; code: "WEAK"; issues: PasswordIssue[] };

/**
 * Parolni o'zgartiradi va foydalanuvchining BOSHQA barcha sessiyalarini tugatadi.
 */
export async function changePassword(input: {
  userId: string;
  currentSessionId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<ChangePasswordResult> {
  const user = await db.user.findUniqueOrThrow({ where: { id: input.userId } });

  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    return { ok: false, code: "WRONG_CURRENT" };
  }
  const issues = checkPassword(input.newPassword, user.username);
  if (issues.length) return { ok: false, code: "WEAK", issues };
  if (input.newPassword === input.currentPassword) return { ok: false, code: "SAME_AS_OLD" };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword), mustChangePassword: false },
  });
  await destroyUserSessions(user.id, input.currentSessionId);
  return { ok: true };
}
