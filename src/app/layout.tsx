import type { Metadata, Viewport } from "next";
import { Manrope, Montserrat } from "next/font/google";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { siteConfig } from "@/config/site.config";
import "./globals.css";

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Sarlavhalar va logotip yozuvi uchun
const heading = Montserrat({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: `${siteConfig.name} — ingliz tili va IELTS onlayn kurslar`, template: `%s · ${siteConfig.name}` },
  description:
    "Saboq School o‘quv markazi: ingliz tili va IELTS bo‘yicha onlayn video darslar — Listening, Reading, Writing, Speaking.",
  // iPhone'da bosh ekranga qo'shilganda brauzer satrisiz, ilova kabi ochiladi
  appleWebApp: { capable: true, title: siteConfig.name, statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    siteName: siteConfig.fullName,
    title: `${siteConfig.name} — ingliz tili va IELTS onlayn kurslar`,
    description: "Tajribali ustozlardan IELTS video darslari: o‘zingizga qulay vaqtda, telefoningizdan.",
  },
};

export const viewport: Viewport = {
  // iPhone'da "notch" va pastki chiziq atrofidagi joyni o'zimiz boshqaramiz (env(safe-area-inset-*))
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#050e1c" },
  ],
};

// Sahifa chizilishidan oldin mavzuni qo'yadi (oq "chaqnash" bo'lmasligi uchun).
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await getLocale();
  // Brauzerga faqat umumiy tarjimalar yuboriladi; admin va kabinet matnlari o'z layout'larida qo'shiladi
  const { common, errors, sections, auth, site } = await getMessages();

  return (
    // data-scroll-behavior: sahifalararo o'tishda Next.js silliq aylanishni vaqtincha o'chiradi (o'tish tez bo'lsin)
    <html lang={locale} data-scroll-behavior="smooth" className={`${body.variable} ${heading.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider messages={{ common, errors, sections, auth, site }}>{children}</NextIntlClientProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
