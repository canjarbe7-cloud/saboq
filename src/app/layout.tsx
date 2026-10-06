import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { siteConfig } from "@/config/site.config";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: `${siteConfig.name} — IELTS onlayn video kurslar`, template: `%s · ${siteConfig.name}` },
  description:
    "SABOQ o‘quv markazining IELTS’ga tayyorlovchi onlayn video darslari: Listening, Reading, Writing, Speaking.",
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    siteName: siteConfig.fullName,
    title: `${siteConfig.name} — IELTS onlayn video kurslar`,
    description: "Tajribali ustozlardan IELTS video darslari: o‘zingizga qulay vaqtda, telefoningizdan.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e1a" },
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
    <html lang={locale} data-scroll-behavior="smooth" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider messages={{ common, errors, sections, auth, site }}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
