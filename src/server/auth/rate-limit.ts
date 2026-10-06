import { db } from "@/server/db";

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_MINUTES = 15;
/** Bitta IP'dan shu oynada ruxsat etilgan xato urinishlar (turli loginlar bo'yicha). */
export const IP_MAX_FAILURES = 30;

const windowStart = (now: Date) => new Date(now.getTime() - LOGIN_LOCK_MINUTES * 60_000);

export type LockState = { locked: false; failures: number } | { locked: true; retryAfterMin: number };

/**
 * Login bo'yicha blok holati: oxirgi muvaffaqiyatli kirishdan keyingi,
 * so'nggi 15 daqiqadagi xato urinishlar sanaladi.
 */
export async function getUsernameLock(username: string, now = new Date()): Promise<LockState> {
  const since = windowStart(now);
  const lastSuccess = await db.loginAttempt.findFirst({
    where: { username, success: true, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const failures = await db.loginAttempt.findMany({
    where: { username, success: false, createdAt: { gt: lastSuccess?.createdAt ?? since } },
    orderBy: { createdAt: "desc" },
    take: LOGIN_MAX_FAILURES,
    select: { createdAt: true },
  });
  if (failures.length < LOGIN_MAX_FAILURES) return { locked: false, failures: failures.length };
  // Blok 5-xato urinishdan boshlab 15 daqiqa davom etadi.
  const unlockAt = failures[0].createdAt.getTime() + LOGIN_LOCK_MINUTES * 60_000;
  return { locked: true, retryAfterMin: Math.max(1, Math.ceil((unlockAt - now.getTime()) / 60_000)) };
}

export async function isIpBlocked(ip: string, now = new Date()): Promise<boolean> {
  // IP aniqlanmagan bo'lsa (proxy sozlanmagan), hamma bitta "unknown" ostida sanalib,
  // butun sayt bloklanib qolmasligi uchun IP cheklovi qo'llanmaydi. Login bo'yicha blok baribir ishlaydi.
  if (ip === "unknown") return false;
  const count = await db.loginAttempt.count({
    where: { ip, success: false, createdAt: { gte: windowStart(now) } },
  });
  return count >= IP_MAX_FAILURES;
}

export async function recordLoginAttempt(username: string, ip: string, success: boolean) {
  await db.loginAttempt.create({ data: { username: username.slice(0, 64), ip, success } });
  // Jadval cheksiz o'smasligi uchun vaqti-vaqti bilan eski yozuvlar tozalanadi
  if (Math.random() < 0.02) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);
    await db.loginAttempt.deleteMany({ where: { createdAt: { lt: dayAgo } } }).catch(() => undefined);
    await db.rateLimit.deleteMany({ where: { windowStart: { lt: dayAgo } } }).catch(() => undefined);
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);
  }
}

/** Admin parolni tiklaganda blokni ham yechadi. */
export async function clearLoginAttempts(username: string) {
  await db.loginAttempt.deleteMany({ where: { username } });
}

/**
 * Umumiy "fixed window" rate-limit (ariza formasi va h.k.).
 * true qaytarsa — ruxsat, false — limitdan oshgan.
 */
export async function consumeRateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec})
                     THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec})
                     THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  return rows[0].count <= limit;
}
