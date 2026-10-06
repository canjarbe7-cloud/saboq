import type { MetadataRoute } from "next";

// Manzil .env dagi APP_URL dan olinadi. Build paytida (masalan Docker'da) .env bo'lmaydi,
// shuning uchun fayl har so'rovda yaratiladi — aks holda unga "localhost" yozilib qolardi.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/kabinet", "/api", "/kirish", "/parol-yangilash"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
