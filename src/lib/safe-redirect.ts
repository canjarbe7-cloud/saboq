/**
 * Login'dan keyin qaytiladigan manzilni ("?next=...") tekshiradi.
 * Faqat foydalanuvchining o'z bo'limi ichidagi ichki manzilga ruxsat beriladi
 * (o'quvchi — /kabinet..., admin — /admin...). Boshqa saytga yo'naltirish ("//evil.com",
 * "https://...", "/\evil.com") va boshqarish belgilari rad etiladi.
 */
export function safeRedirect(next: unknown, home: "/admin" | "/kabinet"): string | null {
  if (typeof next !== "string" || next.length > 500) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f\u007f]/.test(next)) return null;
  const inArea = next === home || next.startsWith(`${home}/`) || next.startsWith(`${home}?`);
  return inArea ? next : null;
}
