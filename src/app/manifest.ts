import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site.config";

/** Telefonda "Bosh ekranga qo'shish" — sayt ilova kabi ochiladi va to'g'ri kabinetga kiradi. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — English va IELTS onlayn kurslar`,
    short_name: siteConfig.name,
    description: "IELTS video darslari, materiallar va progress — telefoningizda.",
    lang: "uz",
    id: "/",
    scope: "/",
    start_url: "/kabinet",
    display: "standalone",
    orientation: "portrait",
    categories: ["education"],
    background_color: "#fdf3ea",
    theme_color: "#14336b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Ilova belgisini bosib turganda chiqadigan tezkor havolalar
    shortcuts: [
      { name: "Davomat", url: "/kabinet/davomat", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Kurslarim", url: "/kabinet", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
