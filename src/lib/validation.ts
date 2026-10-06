import { z } from "zod";

/** Umumiy Zod sxemalari — server va brauzer birga ishlatadi. */

export const idSchema = z.string().min(1).max(40).regex(/^[a-z0-9]+$/i);

/** O'zbekiston telefon raqami → "+998901234567" ko'rinishiga keltiriladi. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => {
    const d = v.replace(/\D/g, "");
    return d.length === 9 ? `998${d}` : d;
  })
  .refine((d) => /^998\d{9}$/.test(d), "phone")
  .transform((d) => `+${d}`);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, "username");

export const nameSchema = z.string().trim().min(2).max(80);
export const titleSchema = z.string().trim().min(2).max(140);

export const SECTIONS = ["LISTENING", "READING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"] as const;
export const LEVELS = ["beginner", "elementary", "intermediate", "upper", "advanced", "unknown"] as const;

export function formatPhone(phone: string): string {
  const m = phone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

/** "Ali Valiyev" → "ali.valiyev"; kurs nomidan slug yasashda ham ishlatiladi. */
export function slugify(input: string, sep = "-"): string {
  return input
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, "")
    .replace(/ş/g, "sh").replace(/ç/g, "ch").replace(/ğ/g, "g").replace(/[öõ]/g, "o").replace(/ü/g, "u")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, sep)
    .replace(new RegExp(`^\\${sep}+|\\${sep}+$`, "g"), "")
    .slice(0, 60);
}

export const REGIONS = [
  "Toshkent shahri", "Toshkent viloyati", "Andijon", "Buxoro", "Farg‘ona", "Jizzax", "Xorazm", "Namangan", "Navoiy",
  "Qashqadaryo", "Qoraqalpog‘iston", "Samarqand", "Sirdaryo", "Surxondaryo", "Chet elda",
] as const;
export const GENDERS = ["MALE", "FEMALE"] as const;

/** Bo'sh qatorni null'ga aylantiradi — "maydonni tozalash" uchun. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), schema.nullable());

/** "@ali_valiyev", "t.me/ali_valiyev" yoki "ali_valiyev" → "ali_valiyev". */
export const telegramSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^(https?:\/\/)?(t\.me\/|telegram\.me\/)/i, "").replace(/^@/, ""))
  .refine((v) => /^[a-z][a-z0-9_]{4,31}$/i.test(v), "telegram");

export const profileSchema = z
  .object({
    birthDate: optional(
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate").refine((v) => {
        const year = Number(v.slice(0, 4));
        return year >= 1940 && year <= new Date().getFullYear() - 5 && !Number.isNaN(Date.parse(v));
      }, "birthDate"),
    ),
    gender: optional(z.enum(GENDERS)),
    region: optional(z.enum(REGIONS)),
    email: optional(z.string().trim().toLowerCase().max(120).pipe(z.email("email"))),
    telegram: optional(telegramSchema),
  })
  .partial();

/** Tug'ilgan sanadan bugungi yoshni hisoblaydi. */
export function ageFrom(birthDate: Date, now = new Date()): number {
  const b = birthDate.toISOString().slice(0, 10);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(now);
  let age = Number(today.slice(0, 4)) - Number(b.slice(0, 4));
  if (today.slice(5) < b.slice(5)) age--;
  return age;
}
