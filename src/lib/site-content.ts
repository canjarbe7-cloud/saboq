import { z } from "zod";
import { faq, results, stats, teachers, testimonials } from "@/config/content";
import { siteConfig } from "@/config/site.config";
import { formatPhone, phoneSchema } from "@/lib/validation";

/**
 * Admin panelda tahrirlanadigan sayt kontenti: sxemalar (server va brauzer birga ishlatadi),
 * boshlang'ich qiymatlar va aloqa ma'lumotlaridan havolalar yasash.
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const optional = (max: number) => z.string().trim().max(max);

/** Ustoz rasmi fayl nomi (server yaratadi): 24 ta hex belgi + kengaytma. */
export const PHOTO_NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/;
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const photoUrl = (name: string) => `/api/site/photo/${name}`;

// "@nom", "t.me/nom" yoki to'liq havola kiritilsa ham faqat username qoladi
const handle = (pattern: RegExp) =>
  z.string().trim().transform((v) => v.replace(/^https?:\/\/[^/]+\//i, "").replace(/^[^/]*\.(me|com)\//i, "").replace(/^@/, "").replace(/\/+$/, "")).pipe(z.string().regex(pattern));

// Formadan matn bo'lib keladi ("40.557149"); bo'sh satr 0 ga aylanib qolmasligi kerak
const coordinate = (limit: number) =>
  z.preprocess((v) => (typeof v === "string" ? (v.trim() === "" ? NaN : Number(v.trim().replace(",", "."))) : v), z.number().min(-limit).max(limit));

export const contentSchemas = {
  teachers: z.array(z.object({
    name: text(60),
    role: optional(80),
    score: optional(10),
    bio: optional(300),
    photo: z.string().regex(PHOTO_NAME).nullable().default(null),
  })).max(12),
  results: z.array(z.object({ name: text(60), score: text(6), detail: optional(60) })).max(24),
  testimonials: z.array(z.object({ name: text(60), meta: optional(40), text: text(500) })).max(12),
  faq: z.array(z.object({ q: text(200), a: text(1000) })).max(20),
  stats: z.array(z.object({ value: text(12), label: text(40) })).max(4),
  contacts: z.object({
    phone: phoneSchema,
    telegram: handle(/^[A-Za-z][A-Za-z0-9_]{3,31}$/),
    instagram: z.union([z.literal(""), handle(/^[A-Za-z0-9._]{1,30}$/)]),
    address: text(120),
    workingHours: text(80),
    lat: coordinate(90),
    lng: coordinate(180),
  }),
} as const;

export const CONTENT_KEYS = ["teachers", "results", "testimonials", "faq", "stats", "contacts"] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];
export type SiteContent = { [K in ContentKey]: z.output<(typeof contentSchemas)[K]> };

/** Server Action uchun: { key, value } — qiymat o'z bo'limining sxemasi bilan tekshiriladi. */
export const contentUpdateSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("teachers"), value: contentSchemas.teachers }),
  z.object({ key: z.literal("results"), value: contentSchemas.results }),
  z.object({ key: z.literal("testimonials"), value: contentSchemas.testimonials }),
  z.object({ key: z.literal("faq"), value: contentSchemas.faq }),
  z.object({ key: z.literal("stats"), value: contentSchemas.stats }),
  z.object({ key: z.literal("contacts"), value: contentSchemas.contacts }),
]);

export const defaultContent: SiteContent = {
  teachers: teachers.map((t) => ({ ...t, photo: null })),
  results: results.map((r) => ({ ...r })),
  testimonials: testimonials.map((t) => ({ ...t })),
  faq: faq.map((f) => ({ ...f })),
  stats: stats.map((s) => ({ ...s })),
  contacts: { ...siteConfig.contacts },
};

/** Aloqa ma'lumotlaridan sahifalarda ishlatiladigan tayyor matn va havolalar. */
export function contactLinks(c: SiteContent["contacts"]) {
  const point = `${c.lat},${c.lng}`;
  return {
    phone: formatPhone(c.phone),
    phoneHref: `tel:${c.phone}`,
    telegram: `@${c.telegram}`,
    telegramHref: `https://t.me/${c.telegram}`,
    instagram: c.instagram ? `@${c.instagram}` : "",
    instagramHref: c.instagram ? `https://www.instagram.com/${c.instagram}/` : "",
    address: c.address,
    workingHours: c.workingHours,
    mapEmbedUrl: `https://www.google.com/maps?q=${point}&z=16&output=embed`,
    googleMapsHref: `https://www.google.com/maps/search/?api=1&query=${point}`,
    // Yandex'da tartib teskari: avval uzunlik, keyin kenglik
    yandexMapsHref: `https://yandex.uz/maps/?pt=${c.lng},${c.lat}&z=16&l=map`,
  };
}
export type ContactLinks = ReturnType<typeof contactLinks>;
