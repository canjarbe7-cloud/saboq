import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Dev rejimida saytni telefondan yoki tarmoq IP'si orqali ochish uchun (masalan http://192.168.x.x:3000):
// Next.js boshqa manzildan kelgan dev so'rovlarini (JS, HMR) sukut bo'yicha bloklaydi.
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts,
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2"],
  // Barcha javoblarga (sahifa, API, statik fayl) qo'yiladigan xavfsizlik header'lari.
  // CSP har so'rovda alohida "nonce" bilan src/proxy.ts da qo'yiladi.
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Kamera faqat o'z sahifalarimizga ochiq — o'quvchi davomat QR kodini skaner qiladi
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
      {
        // Service worker hech qachon keshlanmasin — yangilanganda telefonlar darhol yangi versiyani oladi
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
