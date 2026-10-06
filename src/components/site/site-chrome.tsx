import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Clock, MapPin, Phone, Send } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileNav } from "@/components/site/mobile-nav";
import { siteConfig } from "@/config/site.config";

const LINKS = [
  { href: "/#haqida", key: "about" },
  { href: "/#kurslar", key: "courses" },
  { href: "/#ustozlar", key: "teachers" },
  { href: "/#natijalar", key: "results" },
  { href: "/#savollar", key: "faq" },
  { href: "/aloqa", key: "contact" },
] as const;

export async function SiteHeader() {
  const t = await getTranslations("site.nav");
  const tc = await getTranslations("common");
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-fg">
              {t(l.key)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          {/* Telefonda mavzu tugmasi menyu ichida — sarlavhada joy tejaladi */}
          <span className="hidden sm:contents"><ThemeToggle /></span>
          <ButtonLink href="/kirish" variant="outline" size="sm" className="hidden whitespace-nowrap lg:inline-flex">{t("login")}</ButtonLink>
          <ButtonLink href="/aloqa#ariza" size="sm" className="whitespace-nowrap">{t("apply")}</ButtonLink>
          <MobileNav
            links={LINKS.map((l) => ({ href: l.href, label: t(l.key) }))}
            labels={{ menu: t("menu"), close: tc("close"), login: t("login"), apply: t("apply") }}
          />
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("site");
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1.2fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{t("hero.text")}</p>
          <ButtonLink href="/aloqa#ariza" variant="accent" size="sm" className="mt-5">
            {t("nav.apply")} <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("footer.pages")}</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm font-medium sm:grid-cols-1">
            {LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="transition-colors hover:text-brand">{t(`nav.${l.key}`)}</Link></li>
            ))}
            <li><Link href="/kirish" className="transition-colors hover:text-brand">{t("nav.login")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("footer.contacts")}</p>
          <ul className="space-y-3 text-sm font-medium">
            <li><a href={siteConfig.phoneHref} className="inline-flex items-center gap-2.5 transition-colors hover:text-brand"><Phone className="size-4 text-brand" />{siteConfig.phone}</a></li>
            <li><a href={siteConfig.telegramHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 transition-colors hover:text-brand"><Send className="size-4 text-brand" />{siteConfig.telegram}</a></li>
            <li className="flex items-start gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0 text-brand" />{siteConfig.address}</li>
            <li className="flex items-start gap-2.5 text-muted"><Clock className="mt-0.5 size-4 shrink-0 text-brand" />{siteConfig.workingHours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-muted sm:px-6 sm:text-left">
          © {new Date().getFullYear()} {siteConfig.fullName}. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
