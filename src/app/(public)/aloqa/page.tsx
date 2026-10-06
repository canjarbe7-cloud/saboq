import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Clock, MapPin, Phone, Send } from "lucide-react";
import { ApplicationForm } from "@/components/site/application-form";
import { siteConfig } from "@/config/site.config";

export const metadata: Metadata = {
  title: "Aloqa va kursga yozilish",
  description: "SABOQ o‘quv markazi manzili, telefoni va Telegram’i. IELTS onlayn kursiga yozilish uchun ariza qoldiring.",
  alternates: { canonical: "/aloqa" },
};

export default async function ContactPage() {
  const t = await getTranslations("site.contact");
  const items = [
    { icon: Phone, label: t("phone"), value: siteConfig.phone, href: siteConfig.phoneHref },
    { icon: Send, label: t("telegram"), value: siteConfig.telegram, href: siteConfig.telegramHref, external: true },
    { icon: MapPin, label: t("address"), value: siteConfig.address },
    { icon: Clock, label: t("hours"), value: siteConfig.workingHours },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-96" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-brand">{t("eyebrow")}</p>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-4 text-pretty text-lg text-muted">{t("text")}</p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-12 lg:grid-cols-2 lg:items-start">
          <section id="ariza" className="relative scroll-mt-24 overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand via-brand to-accent" aria-hidden />
            <h2 className="text-2xl font-extrabold tracking-tight">{t("formTitle")}</h2>
            <p className="mb-6 mt-1 text-muted">{t("formText")}</p>
            <ApplicationForm />
          </section>

          <div className="space-y-4">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((item) => {
                const body = (
                  <>
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><item.icon className="size-5" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm text-muted">{item.label}</span>
                      <span className="block font-bold">{item.value}</span>
                    </span>
                  </>
                );
                const cls = "flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card";
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <a
                        href={item.href}
                        className={`${cls} transition-colors hover:border-brand/50`}
                        {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {body}
                      </a>
                    ) : (
                      <div className={cls}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-card">
              <iframe
                src={siteConfig.mapEmbedUrl}
                title={t("map")}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block h-72 w-full border-0 sm:h-80"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
