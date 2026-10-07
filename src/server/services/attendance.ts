import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import type { AttendanceMethod, AttendanceStatus } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";

/**
 * Davomat (QR orqali).
 *
 * Admin davomatni boshlaydi → ekranda QR kod turadi. Kod har ROTATE_MS da almashadi va
 * sessiyaning maxfiy kaliti bilan imzolanadi — rasmga olib boshqa joyga yuborilgan kod
 * bir necha soniyadan keyin yaroqsiz bo'ladi. O'quvchi kabinetdan skaner qilib "Bor" bo'ladi.
 */

/** QR kod almashish oralig'i. */
export const ROTATE_MS = 15_000;
/** Eskirgan kod yana necha oraliq qabul qilinadi (skaner qilib, sahifa ochilguncha vaqt o'tadi). */
const GRACE_SLOTS = 2;
/** Admin yopishni unutgan davomat shuncha vaqtdan keyin skanerni qabul qilmaydi. */
export const MAX_OPEN_MS = 6 * 60 * 60 * 1000;

const sign = (secret: string, sessionId: string, slot: number) =>
  createHmac("sha256", secret).update(`${sessionId}.${slot}`).digest("base64url").slice(0, 22);

/** Hozirgi kod: "<sessiya>.<oraliq>.<imzo>". */
export function currentCode(session: { id: string; secret: string }, now = Date.now()) {
  const slot = Math.floor(now / ROTATE_MS);
  return { code: `${session.id}.${slot}.${sign(session.secret, session.id, slot)}`, msLeft: (slot + 1) * ROTATE_MS - now };
}

const isOpen = (s: { closedAt: Date | null; startedAt: Date }, now = Date.now()) =>
  !s.closedAt && now - s.startedAt.getTime() < MAX_OPEN_MS;

/** Davomatga kirishi kerak bo'lgan o'quvchilar: guruh a'zolari (guruhsiz davomatda — barcha faol o'quvchilar). */
const rosterWhere = (groupId: string | null) =>
  ({ role: "STUDENT", status: "ACTIVE", ...(groupId ? { groupId } : {}) }) as const;

export async function startSession(groupId: string | null) {
  const group = groupId ? await db.group.findUnique({ where: { id: groupId }, select: { name: true } }) : null;
  if (groupId && !group) throw new AppError("notFound");
  return db.attendanceSession.create({
    data: { groupId, title: group?.name ?? "Barcha o‘quvchilar", secret: randomBytes(32).toString("base64url") },
    select: { id: true, title: true },
  });
}

/** Davomatni yakunlaydi: skaner qilmagan o'quvchilar "Yo'q" deb yoziladi. */
export async function closeSession(id: string) {
  const session = await db.attendanceSession.findUnique({ where: { id }, select: { id: true, title: true, groupId: true, closedAt: true } });
  if (!session) throw new AppError("notFound");
  if (session.closedAt) return session;

  const roster = await db.user.findMany({ where: rosterWhere(session.groupId), select: { id: true } });
  await db.$transaction([
    db.attendanceRecord.createMany({
      data: roster.map((u) => ({ sessionId: id, userId: u.id, status: "ABSENT" as const, method: "MANUAL" as const })),
      skipDuplicates: true,
    }),
    db.attendanceSession.update({ where: { id }, data: { closedAt: new Date() } }),
  ]);
  return session;
}

export async function deleteSession(id: string) {
  const session = await db.attendanceSession.findUnique({ where: { id }, select: { title: true } });
  if (!session) throw new AppError("notFound");
  await db.attendanceSession.delete({ where: { id } });
  return session;
}

/** Admin qo'lda belgilaydi (masalan, o'quvchining telefoni yo'q). Yopilgan davomatda ham ishlaydi. */
export async function setManual(sessionId: string, userId: string, status: AttendanceStatus) {
  const [session, user] = await Promise.all([
    db.attendanceSession.findUnique({ where: { id: sessionId }, select: { id: true } }),
    db.user.findFirst({ where: { id: userId, role: "STUDENT" }, select: { id: true } }),
  ]);
  if (!session || !user) throw new AppError("notFound");
  await db.attendanceRecord.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId, status, method: "MANUAL" },
    update: { status, method: "MANUAL", markedAt: new Date() },
  });
}

/**
 * O'quvchi skaner qilgan kodni tekshirib, "Bor" deb belgilaydi.
 * `already` — shu darsga oldin ham belgilangan (qayta skaner qilish xato emas).
 */
export async function checkIn(userId: string, code: string, now = Date.now()) {
  const [sessionId, slotRaw, sig] = code.split(".");
  const slot = Number(slotRaw);
  if (!sessionId || !sig || !Number.isInteger(slot)) throw new AppError("attendanceInvalid");

  const session = await db.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError("attendanceInvalid");

  const expected = Buffer.from(sign(session.secret, session.id, slot));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new AppError("attendanceInvalid");

  if (!isOpen(session, now)) throw new AppError("attendanceClosed");
  const age = Math.floor(now / ROTATE_MS) - slot;
  if (age < 0 || age > GRACE_SLOTS) throw new AppError("attendanceExpired");
  if (session.groupId) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { groupId: true } });
    if (user?.groupId !== session.groupId) throw new AppError("attendanceNotMember", { group: session.title });
  }

  const existing = await db.attendanceRecord.findUnique({ where: { sessionId_userId: { sessionId, userId } } });
  if (existing?.status === "PRESENT") return { title: session.title, markedAt: existing.markedAt, already: true };

  const record = await db.attendanceRecord.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId, status: "PRESENT", method: "QR" },
    update: { status: "PRESENT", method: "QR", markedAt: new Date(now) },
  });
  return { title: session.title, markedAt: record.markedAt, already: false };
}

export type RosterRow = { userId: string; name: string; status: AttendanceStatus | null; method: AttendanceMethod | null; markedAt: string | null };

/** Admin ekrani uchun: sessiya va ro'yxat (kim keldi / kelmadi). Maxfiy kalit qaytarilmaydi — QR kod alohida, getQr'da. */
export async function getSessionView(id: string) {
  const session = await db.attendanceSession.findUnique({
    where: { id },
    select: { id: true, title: true, groupId: true, startedAt: true, closedAt: true, records: { include: { user: { select: { name: true } } } } },
  });
  if (!session) return null;

  const open = isOpen(session);
  // Ochiq davomatda hali skaner qilmaganlar ham ko'rinadi; yopilganda hammaning yozuvi bor
  const roster = session.closedAt ? [] : await db.user.findMany({ where: rosterWhere(session.groupId), select: { id: true, name: true } });
  const rows = new Map<string, RosterRow>(roster.map((u) => [u.id, { userId: u.id, name: u.name, status: null, method: null, markedAt: null }]));
  for (const r of session.records) {
    rows.set(r.userId, { userId: r.userId, name: r.user.name, status: r.status, method: r.method, markedAt: r.markedAt.toISOString() });
  }
  return {
    id: session.id,
    title: session.title,
    startedAt: session.startedAt.toISOString(),
    closed: !!session.closedAt,
    open,
    roster: [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, "uz")),
  };
}

/** Ekrandagi QR kod (SVG, data-URL ko'rinishida) — `origin` saytning tashqi manzili. Davomat ochiq bo'lmasa — null. */
export async function getQr(id: string, origin: string) {
  const session = await db.attendanceSession.findUnique({ where: { id }, select: { id: true, secret: true, startedAt: true, closedAt: true } });
  if (!session || !isOpen(session)) return null;
  const { code, msLeft } = currentCode(session);
  const svg = await QRCode.toString(`${origin}/kabinet/davomat?c=${code}`, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
  return { qr: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, msLeft };
}

export async function listSessions(take = 50) {
  const sessions = await db.attendanceSession.findMany({
    orderBy: { startedAt: "desc" },
    take,
    select: { id: true, title: true, groupId: true, startedAt: true, closedAt: true, records: { select: { status: true } } },
  });
  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    startedAt: s.startedAt,
    open: isOpen(s),
    closed: !!s.closedAt,
    present: s.records.filter((r) => r.status === "PRESENT").length,
    absent: s.records.filter((r) => r.status === "ABSENT").length,
  }));
}

/** O'quvchining o'z davomat tarixi (faqat yakunlangan yoki o'zi belgilangan darslar). */
export async function getStudentAttendance(userId: string, take = 30) {
  const [records, present, absent] = await Promise.all([
    db.attendanceRecord.findMany({
      where: { userId },
      orderBy: { session: { startedAt: "desc" } },
      take,
      select: { status: true, markedAt: true, session: { select: { id: true, title: true, startedAt: true } } },
    }),
    db.attendanceRecord.count({ where: { userId, status: "PRESENT" } }),
    db.attendanceRecord.count({ where: { userId, status: "ABSENT" } }),
  ]);
  return { records, present, absent };
}
