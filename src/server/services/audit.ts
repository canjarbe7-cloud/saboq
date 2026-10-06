import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

/**
 * Admin harakatlari jurnali. Parol va shunga o'xshash maxfiy
 * ma'lumotlar details ichiga HECH QACHON yozilmaydi.
 */
export async function logAudit(entry: {
  actorId: string | null;
  action: string;
  target?: string | null;
  details?: Prisma.InputJsonValue;
  ip?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        target: entry.target ?? null,
        details: entry.details,
        ip: entry.ip ?? null,
      },
    });
  } catch (e) {
    // Jurnalga yozib bo'lmasa ham asosiy amal to'xtamasin
    console.error("[audit]", e);
  }
}
