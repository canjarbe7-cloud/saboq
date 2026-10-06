/** Sana va vaqtni o'zbekcha, Toshkent vaqti bilan ko'rsatish. */
const TZ = "Asia/Tashkent";
const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

function parts(date: Date) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  return { y: get("year"), m: Number(get("month")), d: Number(get("day")), hh: get("hour"), mm: get("minute") };
}

/** 4-oktabr, 2026 */
export function formatDate(date: Date | string): string {
  const { y, m, d } = parts(new Date(date));
  return `${d}-${MONTHS[m - 1]}, ${y}`;
}

/** 4-oktabr, 14:05 */
export function formatDateTime(date: Date | string): string {
  const { m, d, hh, mm } = parts(new Date(date));
  return `${d}-${MONTHS[m - 1]}, ${hh}:${mm}`;
}

/** <input type="date"> uchun: 2026-10-04 (Toshkent vaqti bilan) */
export function toDateInput(date: Date | string): string {
  const { y, m, d } = parts(new Date(date));
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** `months` oy qo'shadi; oy oxiri to'g'ri hisoblanadi: 31-yanvar + 1 oy → 28/29-fevral (3-mart emas). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
}

export function timeAgo(date: Date | string, now = new Date()): string {
  const sec = Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / 1000));
  if (sec < 60) return "hozirgina";
  if (sec < 3600) return `${Math.floor(sec / 60)} daqiqa oldin`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} soat oldin`;
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)} kun oldin`;
  return formatDate(date);
}

/** User-Agent'dan qisqa qurilma nomi: "Chrome · Android" */
export function describeDevice(ua: string | null | undefined): string {
  if (!ua) return "Noma‘lum qurilma";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Boshqa";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /YaBrowser/.test(ua) ? "Yandex"
    : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Brauzer";
  return `${browser} · ${os}`;
}
