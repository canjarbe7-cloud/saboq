import "server-only";
import { headers } from "next/headers";
import { env } from "@/server/env";

/**
 * Mijozning IP manzili. Nginx/Vercel qo'yadigan X-Real-IP ishonchli;
 * u bo'lmasa X-Forwarded-For'ning oxirgi (proxy qo'shgan) qiymati olinadi.
 */
export async function getRequestMeta() {
  const h = await headers();
  const xff = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  const ip = h.get("x-real-ip")?.trim() || xff?.at(-1) || "unknown";
  return { ip: ip.replace(/^::ffff:/, ""), userAgent: h.get("user-agent") };
}

/**
 * CSRF himoyasi (API route'lar uchun): so'rov o'z saytimizdan kelganini tekshiradi.
 * Server Action'larda bu tekshiruvni Next.js o'zi bajaradi.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    const o = new URL(origin).host;
    return o === request.headers.get("host") || o === new URL(env.APP_URL).host;
  } catch {
    return false;
  }
}
