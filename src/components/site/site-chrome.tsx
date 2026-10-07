import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, AtSign, Clock, MapPin, Phone, Send } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Logo, LogoOrnament } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileNav } from "@/components/site/mobile-nav";
import { siteConfig } from "@/config/site.config";
import { getContacts } from "@/server/services/site-content";

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
  const contacts = await getContacts();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold text-fg/80 transition-colors hover:bg-brand-soft hover:text-brand">
              {t(l.key)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          {/* Telefonda mavzu tugmasi menyu ichida — sarlavhada joy tejaladi */}
          <span className="hidden sm:contents"><ThemeToggle /></span>
          <ButtonLink href="/kirish" variant="outline" size="sm" className="hidden whitespace-nowrap lg:inline-flex">{t("login")}</ButtonLink>
          <ButtonLink href="/aloqa#ariza" size="sm" className="whitespace-nowrap max-[359px]:px-2">{t("apply")}</ButtonLink>
          <MobileNav
            links={LINKS.map((l) => ({ href: l.href, label: t(l.key) }))}
            labels={{ menu: t("menu"), close: tc("close"), login: t("login"), apply: t("apply") }}
            contacts={{ phone: contacts.phone, phoneHref: contacts.phoneHref, telegram: contacts.telegram, telegramHref: contacts.telegramHref }}
          />
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("site");
  const contacts = await getContacts();
  const link = "transition-colors hover:text-white";
  return (
    <footer className="relative mt-auto overflow-hidden bg-brand-deep text-white [--mark-hole:var(--brand-deep)] [--on-brand:var(--accent)]">
      <LogoOrnament className="pointer-events-none absolute -bottom-24 -right-20 size-96 text-accent opacity-15" />
      <div className="bg-dots pointer-events-none absolute right-6 top-8 h-20 w-36 text-white/15" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1.2fr]">
        <div>
          <Logo inverse />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70">{t("hero.text")}</p>
          <ButtonLink href="/aloqa#ariza" size="sm" className="mt-6 bg-white text-brand shadow-none hover:bg-white/90">
            {t("nav.apply")} <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        <div>
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.16em] text-white/50">{t("footer.pages")}</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm font-semibold text-white/80 sm:grid-cols-1">
            {LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className={link}>{t(`nav.${l.key}`)}</Link></li>
            ))}
            <li><Link href="/ilova" className={link}>{t("nav.app")}</Link></li>
            <li><Link href="/kirish" className={link}>{t("nav.login")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.16em] text-white/50">{t("footer.contacts")}</p>
          <ul className="space-y-3 text-sm font-semibold text-white/80">
            <li><a href={contacts.phoneHref} className={`inline-flex items-center gap-2.5 text-base font-extrabold text-white ${link}`}><Phone className="size-4" />{contacts.phone}</a></li>
            <li><a href={contacts.telegramHref} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2.5 ${link}`}><Send className="size-4" />{contacts.telegram}</a></li>
            {contacts.instagramHref && <li><a href={contacts.instagramHref} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2.5 ${link}`}><AtSign className="size-4" />Instagram</a></li>}
            <li><a href={contacts.googleMapsHref} target="_blank" rel="noopener noreferrer" className={`flex items-start gap-2.5 ${link}`}><MapPin className="mt-0.5 size-4 shrink-0" />{contacts.address}</a></li>
            <li className="flex items-start gap-2.5 text-white/60"><Clock className="mt-0.5 size-4 shrink-0" />{contacts.workingHours}</li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-white/50 sm:px-6 sm:text-left">
          © {new Date().getFullYear()} {siteConfig.fullName}. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
