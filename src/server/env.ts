import { z } from "zod";

/**
 * Muhit o'zgaruvchilari (.env) — ilova ishga tushganda bir marta tekshiriladi.
 * Noto'g'ri yoki yetishmayotgan qiymat bo'lsa, tushunarli xato bilan to'xtaydi.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.url().default("http://localhost:3000"),
  SESSION_MAX_DEVICES: z.coerce.number().int().min(1).max(10).default(2),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),

  BUNNY_STREAM_LIBRARY_ID: z.string().optional(),
  BUNNY_STREAM_API_KEY: z.string().optional(),
  BUNNY_STREAM_CDN_HOST: z.string().optional(),
  BUNNY_STREAM_TOKEN_KEY: z.string().optional(),
  BUNNY_STORAGE_ZONE: z.string().optional(),
  BUNNY_STORAGE_API_KEY: z.string().optional(),
  BUNNY_STORAGE_HOST: z.string().default("storage.bunnycdn.com"),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`.env faylida xatolik:\n${issues}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
