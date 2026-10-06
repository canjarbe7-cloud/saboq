import "server-only";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { requireAdmin, requireStudent } from "@/server/auth/guards";
import { AppError } from "@/server/errors";
import { getRequestMeta } from "@/server/request";
import { logAudit } from "@/server/services/audit";
import type { SessionUser } from "@/server/auth/session";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

type Ctx = {
  user: SessionUser;
  sessionId: string;
  ip: string;
  /** Admin harakatini jurnalga yozadi. */
  audit: (action: string, target?: string | null, details?: Prisma.InputJsonValue) => Promise<void>;
};

// Zod xabari shu kalitlardan biri bo'lsa, foydalanuvchiga aniq maydon xatosi ko'rsatiladi
const FIELD_ERRORS = new Set(["phone", "username", "email", "telegram", "birthDate"]);

/**
 * Server Action qolipi. Har bir chaqiruvda:
 *  1) rol server tomonida tekshiriladi (admin yoki o'quvchi),
 *  2) kiruvchi ma'lumot Zod sxemasi bilan tekshiriladi,
 *  3) kutilgan xatolar (AppError) o'zbekcha xabarga aylantiriladi,
 *  4) kutilmagan xatolar logga yoziladi, foydalanuvchiga umumiy xabar chiqadi.
 */
function makeAction(role: "ADMIN" | "STUDENT") {
  return function <S extends z.ZodType, R>(schema: S, fn: (input: z.output<S>, ctx: Ctx) => Promise<R>) {
    return async (raw: z.input<S>): Promise<ActionResult<R>> => {
      const active = role === "ADMIN" ? await requireAdmin() : await requireStudent();
      const t = await getTranslations("errors");

      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message;
        return { ok: false, error: msg && FIELD_ERRORS.has(msg) ? t(msg as "phone") : t("invalid") };
      }

      const { ip } = await getRequestMeta();
      const ctx: Ctx = {
        user: active.user,
        sessionId: active.session.id,
        ip,
        audit: (action, target, details) => logAudit({ actorId: active.user.id, action, target, details, ip }),
      };

      try {
        const data = await fn(parsed.data, ctx);
        if (role === "ADMIN") revalidatePath("/admin", "layout");
        return { ok: true, data };
      } catch (e) {
        if (e instanceof AppError) return { ok: false, error: t(e.code as "invalid", e.params) };
        console.error("[action]", e);
        return { ok: false, error: t("unknown") };
      }
    };
  };
}

export const adminAction = makeAction("ADMIN");
export const studentAction = makeAction("STUDENT");
