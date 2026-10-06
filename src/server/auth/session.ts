import { createHash, randomBytes } from "node:crypto";
import type { Role, Session, User } from "@prisma/client";
import { db } from "@/server/db";
import { env } from "@/server/env";

/**
 * Sessiyalar bazada saqlanadi (JWT emas): shunda qurilma limitini qo'yish,
 * admin tomonidan o'chirish va parol o'zgarganda hammasini tugatish mumkin.
 * Cookie'da tasodifiy token, bazada esa faqat uning SHA-256 hash'i turadi.
 */

const TOUCH_INTERVAL_MS = 5 * 60_000;
const ADMIN_MAX_DEVICES = 5;

export type SessionMeta = { ip?: string | null; userAgent?: string | null };
export type SessionUser = Pick<
  User,
  "id" | "name" | "phone" | "username" | "role" | "status" | "mustChangePassword"
>;
export type ActiveSession = { session: Session; user: SessionUser };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const ttlMs = () => env.SESSION_TTL_DAYS * 24 * 60 * 60_000;
export const maxDevicesFor = (role: Role) => (role === "ADMIN" ? ADMIN_MAX_DEVICES : env.SESSION_MAX_DEVICES);

/**
 * Yangi sessiya ochadi. Qurilma limiti to'lgan bo'lsa, eng uzoq vaqt
 * ishlatilmagan sessiya(lar) o'chiriladi. Tokenning o'zini qaytaradi (cookie uchun).
 */
export async function createSession(user: { id: string; role: Role }, meta: SessionMeta = {}) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const limit = maxDevicesFor(user.role);

  await db.$transaction(async (tx) => {
    // Bir vaqtda ikki joydan login qilinsa ham limit buzilmasligi uchun foydalanuvchi bo'yicha qulf.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
    await tx.session.deleteMany({ where: { userId: user.id, expiresAt: { lte: now } } });
    const active = await tx.session.findMany({
      where: { userId: user.id },
      orderBy: { lastSeenAt: "asc" },
      select: { id: true },
    });
    const excess = active.length - limit + 1;
    if (excess > 0) {
      await tx.session.deleteMany({ where: { id: { in: active.slice(0, excess).map((s) => s.id) } } });
    }
    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent?.slice(0, 300) ?? null,
        expiresAt: new Date(now.getTime() + ttlMs()),
      },
    });
  });

  return { token, expiresAt: new Date(now.getTime() + ttlMs()) };
}

/** Tokenni tekshiradi. Muddati o'tgan, o'chirilgan yoki bloklangan bo'lsa — null. */
export async function validateSession(token: string | undefined | null): Promise<ActiveSession | null> {
  if (!token || token.length > 200) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: { id: true, name: true, phone: true, username: true, role: true, status: true, mustChangePassword: true },
      },
    },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (session.user.status !== "ACTIVE") return null;

  // Har so'rovda bazaga yozmaslik uchun "oxirgi faollik" 5 daqiqada bir yangilanadi.
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.updateMany({
      where: { id: session.id },
      data: { lastSeenAt: new Date(now), expiresAt: new Date(now + ttlMs()) },
    });
  }
  const { user, ...rest } = session;
  return { session: rest, user };
}

export async function destroySession(token: string | undefined | null) {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Foydalanuvchining barcha sessiyalarini tugatadi (xohlasa bittasini qoldirib). */
export async function destroyUserSessions(userId: string, exceptSessionId?: string) {
  await db.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}
