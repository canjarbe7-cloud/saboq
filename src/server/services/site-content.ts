import "server-only";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { storage } from "@/server/storage";
import { contactLinks, contentSchemas, CONTENT_KEYS, defaultContent, PHOTO_NAME, type ContentKey, type SiteContent } from "@/lib/site-content";

/**
 * Sayt kontenti (ustozlar, natijalar, fikrlar, FAQ, raqamlar, aloqa) — bazada, har bo'lim bitta yozuv.
 * Admin panelda o'zgartiriladi va darhol saytda ko'rinadi: kodni qayta yuklash kerak emas.
 */

const photoKey = (name: string) => `site/${name}`;

/**
 * Hamma bo'limlar. Saqlanmagan (yoki buzilgan) bo'lim o'rniga boshlang'ich qiymat qaytadi;
 * baza ishlamay qolsa ham ochiq sahifalar boshlang'ich kontent bilan ochilaveradi.
 */
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const content: SiteContent = { ...defaultContent };
  try {
    const rows = await db.siteContent.findMany();
    for (const row of rows) {
      const key = row.key as ContentKey;
      if (!CONTENT_KEYS.includes(key)) continue;
      const parsed = contentSchemas[key].safeParse(row.value);
      if (parsed.success) Object.assign(content, { [key]: parsed.data });
    }
  } catch (e) {
    console.error("[site-content]", e);
  }
  return content;
});

/** Sahifalar uchun tayyor aloqa ma'lumotlari (telefon, havolalar, xarita). */
export const getContacts = cache(async () => contactLinks((await getSiteContent()).contacts));

/** Bo'limni saqlaydi. `value` oldindan sxema bilan tekshirilgan bo'lishi kerak. */
export async function saveSiteContent<K extends ContentKey>(key: K, value: SiteContent[K]) {
  // Ustozlar ro'yxatidan olib tashlangan rasmlar ombordan ham o'chiriladi
  let stale: string[] = [];
  if (key === "teachers") {
    const before = await db.siteContent.findUnique({ where: { key } });
    const old = contentSchemas.teachers.safeParse(before?.value);
    const kept = new Set((value as SiteContent["teachers"]).map((t) => t.photo));
    stale = old.success ? old.data.flatMap((t) => (t.photo && !kept.has(t.photo) ? [t.photo] : [])) : [];
  }
  const json = value as unknown as Prisma.InputJsonValue;
  await db.siteContent.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
  await Promise.all(stale.map((name) => storage.delete(photoKey(name)).catch(() => undefined)));
}

/** Rasm turini ichidagi dastlabki baytlarga qarab aniqlaydi (kengaytmaga ishonilmaydi). */
function detectImage(head: Uint8Array): { ext: string; mime: string } | null {
  const ascii = (from: number, len: number) => String.fromCharCode(...head.slice(from, from + len));
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (head[0] === 0x89 && ascii(1, 3) === "PNG") return { ext: "png", mime: "image/png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Ustoz rasmini saqlaydi va fayl nomini qaytaradi (nom tasodifiy — foydalanuvchidan olinmaydi). */
export async function savePhoto(data: Buffer): Promise<string> {
  const detected = detectImage(data.subarray(0, 16));
  if (!detected) throw new AppError("photoType");
  const name = `${randomBytes(12).toString("hex")}.${detected.ext}`;
  await storage.put(photoKey(name), data, detected.mime);
  return name;
}

export async function getPhoto(name: string): Promise<{ data: Buffer; mime: string } | null> {
  if (!PHOTO_NAME.test(name)) return null;
  const data = await storage.get(photoKey(name));
  return data ? { data, mime: MIME[name.split(".").pop()!] } : null;
}
