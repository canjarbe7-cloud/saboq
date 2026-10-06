import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Har bir so'rovda ishlaydi:
 *  1) xavfsizlik header'larini (CSP, HSTS va b.) qo'yadi;
 *  2) cookie'si yo'q mehmonni yopiq sahifalardan login'ga yo'naltiradi.
 *
 * DIQQAT: bu faqat tezkor dastlabki tekshiruv. Haqiqiy ruxsat tekshiruvi
 * har bir sahifa va API ichida, server tomonida bajariladi (src/server/auth/guards.ts).
 */
const PROTECTED = ["/kabinet", "/admin", "/parol-yangilash"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!request.cookies.has(SESSION_COOKIE)) {
      const login = new URL("/kirish", request.url);
      // Kirgandan keyin shu sahifaga qaytish uchun (masalan, Telegram'da yuborilgan dars havolasi)
      if (pathname !== "/parol-yangilash") login.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(login);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Animatsiyalar (inline style atributlari) uchun style-src-attr alohida ochilgan
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob: https://*.b-cdn.net`,
    `font-src 'self' data:`,
    `media-src 'self' blob: https://*.b-cdn.net`,
    `connect-src 'self' https://*.b-cdn.net https://video.bunnycdn.com${isDev ? " ws: wss:" : ""}`,
    `worker-src 'self' blob:`,
    `frame-src https://www.google.com https://yandex.uz https://yandex.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : [`upgrade-insecure-requests`]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // Qolgan xavfsizlik header'lari (HSTS, X-Frame-Options va b.) next.config.ts da — ular API javoblariga ham qo'yiladi.
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
