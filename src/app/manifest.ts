import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site.config";

/** Telefonda "Bosh ekranga qo'shish" — sayt ilova kabi ochiladi va to'g'ri kabinetga kiradi. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — IELTS onlayn kurslar`,
    short_name: siteConfig.name,
    description: "IELTS video darslari, materiallar va progress — telefoningizda.",
    lang: "uz",
    start_url: "/kabinet",
    display: "standalone",
    background_color: "#eef0f6",
    theme_color: "#4338ca",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
