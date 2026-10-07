/**
 * Markaz nomi va BOSHLANG'ICH aloqa ma'lumotlari.
 *
 * Telefon, Telegram, manzil, ish vaqti va xarita nuqtasi admin panelning "Sayt kontenti" bo'limida
 * o'zgartiriladi (bazada saqlanadi). Bu yerdagi qiymatlar faqat admin hali hech narsa saqlamagan
 * paytda ishlatiladi.
 */
export const siteConfig = {
  name: "Saboq",
  fullName: "Saboq School",
  /** Logotip ostidagi kichik yozuv. */
  tagline: "school",
  contacts: {
    phone: "+998911556255",
    /** Telegram username, "@" belgisisiz. */
    telegram: "Saboq_school_official",
    /** Instagram username, "@" belgisisiz. Bo'sh bo'lsa — saytda ko'rsatilmaydi. */
    instagram: "saboq.school",
    address: "Farg‘ona vil., Buvayda tumani, Yangiqo‘rg‘on",
    workingHours: "Dushanba – Shanba, 09:00 – 20:00",
    /** Xaritadagi nuqta: kenglik va uzunlik. */
    lat: 40.557149,
    lng: 71.14417,
  },
} as const;
