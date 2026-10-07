import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Clock, MapPin, Navigation, Phone, Send } from "lucide-react";
import { ApplicationForm } from "@/components/site/application-form";
import { buttonClass } from "@/components/ui/button";
import { LogoOrnament } from "@/components/ui/logo";
import { getContacts } from "@/server/services/site-content";

export const metadata: Metadata = {
  title: "Aloqa va kursga yozilish",
  description: "Saboq School manzili, telefoni va Telegram’i. Ingliz tili va IELTS onlayn kursiga yozilish uchun ariza qoldiring.",
  alternates: { canonical: "/aloqa" },
};

export default async function ContactPage() {
  const t = await getTranslations("site.contact");
  const contacts = await getContacts();
  const items = [
    { icon: Phone, label: t("phone"), value: contacts.phone, href: contacts.phoneHref },
    { icon: Send, label: t("telegram"), value: contacts.telegram, href: contacts.telegramHref, external: true },
    { icon: MapPin, label: t("address"), value: contacts.address },
    { icon: Clock, label: t("hours"), value: contacts.workingHours },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="bg-sky pointer-events-none absolute inset-x-0 top-0 h-[28rem]" aria-hidden />
      <div className="bg-dots pointer-events-none absolute right-[8%] top-10 hidden h-24 w-40 text-brand/30 sm:block" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-16">
        <header className="mx-auto max-w-2xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-brand shadow-card"><LogoOrnament className="size-4 text-accent" />{t("eyebrow")}</p>
          <h1 className="text-balance text-[2rem] font-extrabold leading-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-3 text-pretty text-base text-muted sm:mt-4 sm:text-lg">{t("text")}</p>
        </header>

        <div className="mt-7 grid grid-cols-1 gap-6 sm:mt-10 lg:mt-12 lg:grid-cols-2 lg:items-start">
          <section id="ariza" className="relative scroll-mt-24 overflow-hidden rounded-3xl border border-line bg-surface p-5 pt-7 shadow-card sm:p-8">
            <div className="absolute inset-x-0 top-0 h-2 bg-brand" aria-hidden />
            <h2 className="text-2xl font-extrabold">{t("formTitle")}</h2>
            <p className="mb-6 mt-1 text-muted">{t("formText")}</p>
            <ApplicationForm />
          </section>

          <div className="space-y-4">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {items.map((item) => {
                const body = (
                  <>
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-brand-fg"><item.icon className="size-5" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm text-muted">{item.label}</span>
                      <span className="block break-words font-extrabold">{item.value}</span>
                    </span>
                  </>
                );
                const cls = "flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card";
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <a
                        href={item.href}
                        className={`${cls} transition-colors hover:border-brand`}
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
                src={contacts.mapEmbedUrl}
                title={t("map")}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block h-72 w-full border-0 sm:h-80"
              />
              <div className="grid grid-cols-1 gap-2 bg-surface p-3 sm:grid-cols-2">
                <a href={contacts.googleMapsHref} target="_blank" rel="noopener noreferrer" className={buttonClass({ size: "md" }, "px-4")}>
                  <MapPin className="size-4" /> {t("openGoogle")}
                </a>
                <a href={contacts.yandexMapsHref} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "outline", size: "md" }, "px-4")}>
                  <Navigation className="size-4 text-brand" /> {t("openYandex")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
