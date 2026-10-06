import type { MetadataRoute } from "next";

// robots.ts dagi kabi: APP_URL build paytida emas, so'rov paytida o'qiladi.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/aloqa`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
