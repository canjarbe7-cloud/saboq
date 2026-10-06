/**
 * Sessiya cookie nomi. Production'da "__Host-" prefiksi brauzerni cookie'ni
 * faqat HTTPS orqali va faqat shu domen uchun qabul qilishga majbur qiladi.
 */
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-admire_session" : "admire_session";
