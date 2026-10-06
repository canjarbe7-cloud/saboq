import { mkdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/server/env";

/**
 * Dars materiallari (PDF, audio) ombori.
 *  - BUNNY_STORAGE_* to'ldirilgan bo'lsa — Bunny Storage;
 *  - aks holda — serverdagi ./storage papkasi (lokal ishlab chiqish yoki bitta VPS uchun).
 * Fayllar hech qachon ochiq havola orqali berilmaydi: yuklab olish faqat
 * ruxsatni tekshiradigan /api/materials/[id] yo'li orqali.
 */
export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const LOCAL_ROOT = path.resolve(process.cwd(), "storage");

/** Kalit faqat biz yaratgan xavfsiz belgilardan iborat bo'lishi kerak (../ kabi yo'llar taqiqlanadi). */
function safeKey(key: string): string {
  if (!/^[a-z0-9][a-z0-9/_.-]*$/i.test(key) || key.includes("..")) throw new Error("Invalid storage key");
  return key;
}

const local: Storage = {
  async put(key, data) {
    const file = path.join(LOCAL_ROOT, safeKey(key));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  },
  async get(key) {
    return readFile(path.join(LOCAL_ROOT, safeKey(key))).catch(() => null);
  },
  async delete(key) {
    const file = path.join(LOCAL_ROOT, safeKey(key));
    await rm(file, { force: true });
    // Darsning oxirgi materiali o'chsa, bo'sh qolgan papkasi ham o'chadi (rmdir bo'sh bo'lmagan papkaga tegmaydi)
    await rmdir(path.dirname(file)).catch(() => undefined);
  },
};

const bunnyUrl = (key: string) => `https://${env.BUNNY_STORAGE_HOST}/${env.BUNNY_STORAGE_ZONE}/${safeKey(key)}`;
const bunnyHeaders = () => ({ AccessKey: env.BUNNY_STORAGE_API_KEY! });

const bunny: Storage = {
  async put(key, data, contentType) {
    const res = await fetch(bunnyUrl(key), {
      method: "PUT",
      headers: { ...bunnyHeaders(), "Content-Type": contentType },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Bunny Storage PUT ${res.status}`);
  },
  async get(key) {
    const res = await fetch(bunnyUrl(key), { headers: bunnyHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Bunny Storage GET ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  },
  async delete(key) {
    await fetch(bunnyUrl(key), { method: "DELETE", headers: bunnyHeaders() });
  },
};

export const storage: Storage = env.BUNNY_STORAGE_ZONE && env.BUNNY_STORAGE_API_KEY ? bunny : local;
