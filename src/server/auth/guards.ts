import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { isProd } from "@/server/env";
import { isSameOrigin } from "@/server/request";
import { validateSession, type ActiveSession } from "./session";

/**
 * Ruxsat tekshiruvlari. Har bir yopiq sahifa, Server Action va API
 * shu funksiyalardan birini chaqirishi SHART — frontend'da yashirish yetarli emas.
 */

export const homeFor = (role: Role) => (role === "ADMIN" ? "/admin" : "/kabinet");

/** Joriy so'rov uchun sessiya (bitta so'rov ichida bazaga faqat bir marta murojaat qiladi). */
export const getCurrentSession = cache(async (): Promise<ActiveSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return validateSession(token);
});

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    // Haqiqiy muddatni baza belgilaydi; cookie shunchaki undan uzoqroq yashaydi.
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

type RequireOpts = { allowMustChangePassword?: boolean };

/** Sahifa va Server Action'lar uchun: kirmagan bo'lsa login sahifasiga yo'naltiradi. */
export async function requireUser(opts: RequireOpts = {}): Promise<ActiveSession> {
  const active = await getCurrentSession();
  if (!active) redirect("/kirish");
  if (active.user.mustChangePassword && !opts.allowMustChangePassword) redirect("/parol-yangilash");
  return active;
}

export async function requireAdmin(): Promise<ActiveSession> {
  const active = await requireUser();
  if (active.user.role !== "ADMIN") redirect(homeFor(active.user.role));
  return active;
}

export async function requireStudent(): Promise<ActiveSession> {
  const active = await requireUser();
  if (active.user.role !== "STUDENT") redirect(homeFor(active.user.role));
  return active;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

/**
 * API route'lar uchun: yo'naltirish o'rniga 401/403 xato tashlaydi.
 * GET bo'lmagan so'rovlarda CSRF (origin) tekshiruvi ham bajariladi.
 */
export async function requireApiUser(request: Request, role?: Role): Promise<ActiveSession> {
  if (!["GET", "HEAD"].includes(request.method) && !isSameOrigin(request)) {
    throw new ApiError(403, "BAD_ORIGIN");
  }
  const active = await getCurrentSession();
  if (!active) throw new ApiError(401, "UNAUTHORIZED");
  if (active.user.mustChangePassword) throw new ApiError(403, "PASSWORD_CHANGE_REQUIRED");
  if (role && active.user.role !== role) throw new ApiError(403, "FORBIDDEN");
  return active;
}

/** API route'ni o'rab, ApiError'ni JSON javobga aylantiradi. */
export function apiHandler<Ctx>(fn: (request: Request, ctx: Ctx) => Promise<Response>) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(request, ctx);
    } catch (e) {
      if (e instanceof ApiError) return Response.json({ error: e.code }, { status: e.status });
      console.error("[api]", e);
      return Response.json({ error: "INTERNAL" }, { status: 500 });
    }
  };
}
