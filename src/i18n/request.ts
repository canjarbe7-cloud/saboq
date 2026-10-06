import { getRequestConfig } from "next-intl/server";

/**
 * Hozircha faqat o'zbek tili. Yangi til qo'shish uchun:
 *  1) messages/uz papkasidan nusxa olib, messages/ru (yoki en) yarating va tarjima qiling,
 *  2) LOCALES ro'yxatiga qo'shing,
 *  3) tilni cookie yoki URL'dan o'qib, shu yerda qaytaring.
 */
export const LOCALES = ["uz"] as const;
export const DEFAULT_LOCALE = "uz";

// Tarjimalar bo'limlarga ajratilgan — har bir fayl bitta "namespace"
const FILES = ["common", "auth", "admin", "student", "site"] as const;

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  const parts = await Promise.all(FILES.map((f) => import(`../../messages/${locale}/${f}.json`)));
  return {
    locale,
    timeZone: "Asia/Tashkent",
    messages: Object.assign({}, ...parts.map((p) => p.default)),
  };
});
