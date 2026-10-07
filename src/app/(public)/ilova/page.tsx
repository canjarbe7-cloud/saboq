import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Check, LogIn, Monitor, Smartphone } from "lucide-react";
import { InstallButton } from "@/components/pwa/install-app";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark, LogoOrnament } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Ilovani o‘rnatish",
  description: "Saboq ilovasini telefoningizga o‘rnating: Android va iPhone uchun, Play Market’siz.",
  alternates: { canonical: "/ilova" },
};

/** Ilovani o'rnatish sahifasi — o'quvchilarga shu havola yuboriladi. */
export default async function AppPage() {
  const t = await getTranslations("site.app");
  const points = t.raw("points") as string[];
  const guides = [
    { icon: Smartphone, title: t("android"), steps: t.raw("androidSteps") as string[] },
    { icon: Smartphone, title: t("ios"), steps: t.raw("iosSteps") as string[] },
    { icon: Monitor, title: t("desktop"), steps: t.raw("desktopSteps") as string[] },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
      <section className="relative overflow-hidden rounded-[2rem] bg-brand px-6 py-10 text-brand-fg shadow-2xl shadow-brand/30 [--mark-hole:var(--brand)] sm:px-12 sm:py-14">
        <LogoOrnament className="pointer-events-none absolute -right-20 -top-20 size-80 animate-spin-slow text-on-brand opacity-25" />
        <div className="bg-dots pointer-events-none absolute bottom-6 right-8 hidden h-24 w-40 text-white/25 sm:block" aria-hidden />
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
          {/* Bosh ekrandagi ilova belgisi qanday ko'rinishi */}
          <span className="grid size-24 shrink-0 place-items-center rounded-[1.75rem] bg-[#fdf3ea] text-[#081d38] shadow-xl [--mark-accent:#f76c19] [--mark-hole:#fdf3ea] sm:size-28">
            <LogoMark className="size-16 sm:size-20" />
          </span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/70">{t("eyebrow")}</p>
            <h1 className="mt-2 text-balance text-3xl font-black sm:text-5xl sm:leading-[1.1]">{t("title")}</h1>
            <p className="mt-3 max-w-xl text-pretty font-medium text-white/85 sm:text-lg">{t("text")}</p>
          </div>
        </div>
        <ul className="relative mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-white/90">
          {points.map((p) => (
            <li key={p} className="inline-flex items-center gap-1.5">
              <span className="grid size-4 place-items-center rounded-full bg-white text-brand"><Check className="size-3" strokeWidth={4} /></span> {p}
            </li>
          ))}
        </ul>
        <div className="relative mt-7">
          <InstallButton />
        </div>
      </section>

      <h2 className="mb-4 mt-10 text-2xl font-extrabold sm:mt-14 sm:text-3xl">{t("stepsTitle")}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {guides.map((g) => (
          <section key={g.title} className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
            <h3 className="flex items-center gap-2.5 text-lg font-extrabold">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand text-brand-fg"><g.icon className="size-5" /></span>
              {g.title}
            </h3>
            <ol className="mt-4 space-y-3">
              {g.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-xs font-black text-brand">{i + 1}</span>
                  <span className="pt-0.5 font-medium">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-start gap-4 rounded-3xl bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="font-bold">{t("after")}</p>
        <ButtonLink href="/kirish" className="shrink-0"><LogIn className="size-5" /> {t("login")}</ButtonLink>
      </div>
    </div>
  );
}
