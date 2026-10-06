/**
 * Markaz haqidagi asosiy ma'lumotlar — hammasi shu bitta faylda.
 * Manzil, telefon yoki Telegram o'zgarsa, faqat shu yerni tahrirlang.
 */
export const siteConfig = {
  name: "SABOQ",
  fullName: "SABOQ o‘quv markazi",
  // TODO: haqiqiy ma'lumotlar bilan almashtiring
  address: "Toshkent sh., Namuna ko‘chasi, 1-uy",
  phone: "+998 90 000 00 00",
  phoneHref: "tel:+998900000000",
  telegram: "@canjarbe7",
  telegramHref: "https://t.me/canjarbe7",
  workingHours: "Dushanba – Shanba, 09:00 – 20:00",
  /** Xarita uchun "embed" havola (Google Maps → Share → Embed a map). */
  mapEmbedUrl:
    "https://www.google.com/maps?q=41.311081,69.240562&z=15&output=embed",
} as const;
