import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight, Check, CheckCircle2, Circle, Flame, MessageCircleQuestion, Phone, Play, PlayCircle, Quote, Send, Star,
  Target, Timer, TrendingUp, Trophy,
} from "lucide-react";
import { FadeIn } from "@/components/site/fade-in";
import { ButtonLink } from "@/components/ui/button";
import { LogoOrnament } from "@/components/ui/logo";
import { SectionIcon } from "@/components/ui/section-icon";
import { siteConfig } from "@/config/site.config";
import { getSiteContent } from "@/server/services/site-content";
import { contactLinks, photoUrl, type ContactLinks } from "@/lib/site-content";
import { SECTIONS } from "@/lib/validation";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const ABOUT_ICONS = [Target, Timer, TrendingUp, Star];

function Eyebrow({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-brand", className)}>
      <LogoOrnament className="size-4 text-accent [--mark-hole:var(--brand-soft)]" />
      {children}
    </p>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <FadeIn className="mb-6 grid grid-cols-1 items-end gap-x-12 gap-y-3 sm:mb-12 sm:gap-y-4 lg:grid-cols-[1.2fr_1fr]">
      <div>
        {eyebrow && <Eyebrow className="mb-3 sm:mb-4">{eyebrow}</Eyebrow>}
        <h2 className="text-balance text-[1.7rem] font-extrabold leading-tight sm:text-[2.75rem] sm:leading-[1.1]">{title}</h2>
      </div>
      {text && <p className="text-pretty text-base font-medium text-muted sm:text-lg lg:border-l-4 lg:border-brand lg:pl-5">{text}</p>}
    </FadeIn>
  );
}

/** "L 8.5 · R 8.5 · W 7.0 · S 7.5" → [{ label: "L", score: "8.5" }, …]; formati boshqacha bo'lsa — null. */
function parseBands(detail: string) {
  const bands = detail.split("·").map((part) => part.trim().match(/^(\S+)\s+(\S+)$/));
  return bands.every(Boolean) ? bands.map((m) => ({ label: m![1], score: m![2] })) : null;
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export default async function HomePage() {
  const t = await getTranslations("site");
  const ts = await getTranslations("sections");
  const about = t.raw("about.items") as { title: string; text: string }[];
  const steps = t.raw("steps.items") as { title: string; text: string }[];
  const points = t.raw("hero.points") as string[];
  const cardLessons = t.raw("hero.cardLessons") as string[];
  // Ustozlar, natijalar, fikrlar, savollar, raqamlar va aloqa — admin paneldagi "Sayt kontenti"dan
  const { teachers, results, testimonials, faq, stats, contacts: rawContacts } = await getSiteContent();
  const contacts = contactLinks(rawContacts);

  // Qidiruv tizimlari uchun tuzilgan ma'lumot (SEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: siteConfig.fullName,
    address: contacts.address,
    telephone: contacts.phone,
    url: process.env.APP_URL,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* ── Hero: Instagram postlaridagi kabi osmon foni, yirik sarlavha va ko'k plashka ── */}
      <section className="bg-sky relative overflow-hidden">
        <div className="bg-dots pointer-events-none absolute right-[6%] top-8 hidden h-24 w-44 text-brand/35 sm:block" aria-hidden />
        <LogoOrnament className="pointer-events-none absolute -left-28 top-40 size-80 text-accent opacity-[0.12] [--mark-hole:transparent]" />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-12 pt-6 sm:gap-16 sm:px-6 sm:pb-14 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:pb-20 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-surface py-1 pl-1.5 pr-3.5 text-[13px] font-extrabold text-fg shadow-card sm:py-1.5 sm:pl-2 sm:pr-4 sm:text-sm">
              <span className="relative grid size-5 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-brand/40" />
                <span className="relative size-2.5 rounded-full bg-brand" />
              </span>
              {t("hero.admission")}
            </span>
            <h1 className="mt-4 text-[1.8rem] font-black leading-[1.22] min-[380px]:text-[2rem] min-[430px]:text-[2.25rem] sm:mt-6 sm:text-balance sm:text-6xl sm:leading-[1.14] lg:text-[4rem]">
              {t("hero.title", { score: "7.0+" })}
              {/* Telefonda tire o'rniga qator almashadi */}
              <span className="max-sm:hidden"> — </span><br className="sm:hidden" />
              <span className="highlight-box">{t("hero.titleAccent")}</span>
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base font-medium leading-relaxed text-muted sm:mt-6 sm:text-lg">{t("hero.text")}</p>
            {/* Telefonda: yozilish tugmasi va yonida dumaloq qo'ng'iroq tugmasi — bir qatorda */}
            <div className="mt-6 flex gap-2.5 sm:mt-8 sm:gap-3">
              <ButtonLink href="/aloqa#ariza" size="lg" className="h-14 min-w-0 flex-1 px-5 text-base shadow-xl shadow-brand/30 sm:flex-none sm:px-8">
                {t("hero.cta")} <ArrowRight className="size-5" />
              </ButtonLink>
              <a
                href={contacts.phoneHref}
                aria-label={`${t("hero.call")}: ${contacts.phone}`}
                className="group inline-flex h-14 shrink-0 items-center gap-3 rounded-full bg-surface p-2 shadow-card transition-transform active:scale-[0.98] sm:pr-6"
              >
                <span className="grid size-10 place-items-center rounded-full bg-brand text-brand-fg transition-transform group-hover:-rotate-12"><Phone className="size-5" fill="currentColor" /></span>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-xs font-semibold text-muted">{t("hero.call")}</span>
                  <span className="block font-display text-base font-extrabold tabular-nums">{contacts.phone}</span>
                </span>
              </a>
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-bold text-fg/80 sm:mt-7 sm:gap-x-5 sm:gap-y-2 sm:text-sm">
              {points.map((p) => (
                <li key={p} className="inline-flex items-center gap-1.5">
                  <span className="grid size-4 place-items-center rounded-full bg-brand text-brand-fg"><Check className="size-3" strokeWidth={4} /></span> {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Kabinet ko'rinishidan namuna */}
          <div className="relative mx-auto w-full max-w-md pr-3 sm:pr-0 lg:max-w-[28rem]" aria-hidden>
            <div className="absolute -bottom-3 right-0 left-8 top-8 -z-10 rounded-[2.25rem] bg-brand sm:-bottom-5 sm:-right-5" />
            <div className="bg-dots absolute -bottom-12 -left-8 -z-10 h-28 w-28 text-brand/40" />
            <div className="rounded-[2rem] border border-line bg-surface p-4 shadow-2xl shadow-brand/20 sm:p-5">
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-brand [--mark-hole:var(--brand)]">
                <LogoOrnament className="absolute -right-10 -top-10 size-44 animate-spin-slow text-on-brand opacity-30" />
                <div className="bg-dots absolute bottom-6 left-3 h-10 w-20 text-white/25" />
                <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-brand">{t("hero.cardModule")}</span>
                <span className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full bg-white text-brand shadow-xl">
                  <Play className="ml-1 size-7 fill-current" />
                </span>
                <div className="absolute inset-x-3 bottom-3 h-1.5 rounded-full bg-white/25">
                  <div className="h-full w-[64%] rounded-full bg-white" />
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-brand">{t("hero.cardTitle")}</p>
                  <p className="mt-0.5 font-extrabold leading-snug">{t("hero.cardLesson")}</p>
                </div>
                <span className="shrink-0 rounded-full bg-brand px-2.5 py-1 text-xs font-extrabold text-brand-fg">64%</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {cardLessons.map((lesson, i) => (
                  <li
                    key={lesson}
                    className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold", i === 1 ? "bg-brand-soft font-extrabold text-brand" : "text-muted")}
                  >
                    {i === 0 ? <CheckCircle2 className="size-4 text-success" /> : i === 1 ? <PlayCircle className="size-4" /> : <Circle className="size-4" />}
                    {lesson}
                  </li>
                ))}
              </ul>
            </div>
            <div className="absolute -left-1 -top-5 flex animate-float items-center gap-2 rounded-full bg-accent px-3.5 py-2 text-[13px] sm:px-4 sm:py-2.5 sm:text-sm font-extrabold text-accent-fg shadow-xl sm:-left-8">
              <Flame className="size-5" fill="currentColor" /> {t("hero.cardStreak")}
            </div>
            <div className="absolute -bottom-6 right-0 flex animate-float items-center gap-2 rounded-full bg-surface py-1.5 pl-1.5 pr-3.5 text-[13px] sm:gap-2.5 sm:py-2 sm:pl-2 sm:pr-4 sm:text-sm font-extrabold shadow-xl [animation-delay:-3.5s] sm:-right-8">
              <span className="grid size-8 place-items-center rounded-full bg-brand text-brand-fg"><Trophy className="size-4" /></span>
              {t("hero.cardAchievement")}
            </div>
          </div>
        </div>

        {/* Raqamlar — yaxlit ko'k tasma */}
        <div className="relative mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16">
          <dl className="relative grid grid-cols-2 overflow-hidden rounded-3xl bg-brand text-brand-fg shadow-xl shadow-brand/30 sm:grid-cols-4">
            <div className="bg-dots pointer-events-none absolute -right-2 top-2 hidden h-16 w-32 text-white/15 sm:block" aria-hidden />
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "relative flex flex-col-reverse items-center gap-1 border-white/15 px-2 py-5 text-center sm:px-3 sm:py-8",
                  i % 2 === 1 && "border-l",
                  i < 2 && "border-b sm:border-b-0",
                  i === 2 && "sm:border-l",
                )}
              >
                <dt className="text-[13px] font-semibold leading-tight text-white/75 sm:text-sm">{s.label}</dt>
                <dd className="font-display text-3xl font-black tracking-tight sm:text-5xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Markaz haqida ── */}
      <section id="haqida" className="scroll-mt-20 py-12 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={t("about.eyebrow")} title={t("about.title")} text={t("about.text")} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {about.map((item, i) => {
              const Icon = ABOUT_ICONS[i % ABOUT_ICONS.length];
              return (
                <FadeIn
                  key={item.title}
                  delay={i}
                  className="group relative flex gap-4 overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-brand sm:flex-col sm:gap-5 sm:p-6"
                >
                  <span className="absolute bottom-1 right-4 font-display text-4xl font-black sm:bottom-auto sm:top-2 sm:text-5xl text-brand/10 transition-colors group-hover:text-brand/25" aria-hidden>0{i + 1}</span>
                  <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-brand-fg shadow-lg shadow-brand/30"><Icon className="size-6" /></span>
                  <div className="relative">
                    <h3 className="text-lg font-extrabold leading-snug">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Kurslar ── */}
      <section id="kurslar" className="scroll-mt-20 bg-surface py-12 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={t("courses.eyebrow")} title={t("courses.title")} text={t("courses.text")} />
          {/* Telefonda — 2 ustunli ixcham kataklar (sahifa qisqaroq bo'ladi) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {SECTIONS.map((s, i) => (
              <FadeIn
                key={s}
                delay={i % 3}
                className="group relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-bg p-4 transition-colors duration-300 hover:bg-brand hover:text-brand-fg sm:gap-5 sm:p-6"
              >
                <LogoOrnament className="absolute -bottom-10 -right-10 size-32 text-brand opacity-[0.06] transition-all duration-500 [--mark-hole:transparent] group-hover:rotate-45 group-hover:text-white group-hover:opacity-15" />
                <SectionIcon section={s} className="relative size-11 rounded-2xl transition-colors duration-300 group-hover:bg-white group-hover:text-brand sm:size-12" iconClassName="size-6" />
                <div className="relative">
                  <h3 className="text-lg font-extrabold sm:text-xl">{ts(s)}</h3>
                  <p className="mt-1 text-sm leading-snug text-muted transition-colors duration-300 group-hover:text-white/85 sm:mt-1.5 sm:text-base sm:leading-normal">{t(`courses.${s}`)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qanday boshlanadi ── */}
      <section className="py-12 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={t("steps.eyebrow")} title={t("steps.title")} />
          {/* Telefonda — bitta kartochka ichida chiziq bilan bog'langan ketma-ketlik; kattaroq ekranda — 3 ta kartochka */}
          <ol className="grid grid-cols-1 rounded-3xl border border-line bg-surface p-5 shadow-card md:grid-cols-3 md:gap-6 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="relative pb-6 before:absolute before:bottom-0 before:left-6 before:top-12 before:w-0.5 before:bg-brand-soft last:pb-0 last:before:hidden md:pb-0 md:before:hidden"
              >
                <FadeIn delay={i} className="flex h-full gap-4 md:flex-col md:gap-5 md:rounded-3xl md:border md:border-line md:bg-surface md:p-7 md:shadow-card">
                  <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-brand font-display text-lg font-black text-brand-fg shadow-lg shadow-brand/30 md:size-14 md:text-xl">
                    {i + 1}
                  </span>
                  <div className="pt-0.5 md:pt-0">
                    <h3 className="text-lg font-extrabold md:text-xl">{step.title}</h3>
                    <p className="mt-1.5 text-muted">{step.text}</p>
                  </div>
                </FadeIn>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Ustozlar ── */}
      <section id="ustozlar" className="scroll-mt-20 bg-surface py-12 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={t("teachers.eyebrow")} title={t("teachers.title")} text={t("teachers.text")} />
          {/* Telefonda — yonga suriladigan karusel, kattaroq ekranda — to'r */}
          <FadeIn>
            <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3">
              {teachers.map((teacher, i) => (
                <li key={i} className="w-[80%] shrink-0 snap-center overflow-hidden rounded-3xl border border-line bg-bg text-center sm:w-auto">
                  <div className="relative h-24 bg-brand [--mark-hole:var(--brand)]">
                    <LogoOrnament className="absolute -right-6 -top-8 size-32 text-on-brand opacity-30" />
                    <div className="bg-dots absolute bottom-3 left-4 h-8 w-16 text-white/25" aria-hidden />
                    {teacher.score && (
                      <p className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-brand">
                        <Star className="size-3.5 text-accent" fill="currentColor" /> {teacher.score}
                      </p>
                    )}
                  </div>
                  <div className="px-6 pb-6">
                    <span className="relative mx-auto -mt-10 grid size-20 place-items-center overflow-hidden rounded-full border-4 border-bg bg-surface font-display text-2xl font-black text-brand shadow-card">
                      {teacher.photo ? (
                        // Rasm o'z serverimizdan, tayyor o'lchamda keladi — next/image kerak emas
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl(teacher.photo)} alt="" loading="lazy" className="size-full object-cover" />
                      ) : (
                        initials(teacher.name)
                      )}
                    </span>
                    <h3 className="mt-3 text-lg font-extrabold">{teacher.name}</h3>
                    <p className="text-sm font-bold text-brand">{teacher.role}</p>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{teacher.bio}</p>
                  </div>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* ── Natijalar ── */}
      <section id="natijalar" className="scroll-mt-20 py-12 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={t("results.eyebrow")} title={t("results.title")} text={t("results.text")} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {results.map((r, i) => {
              const bands = parseBands(r.detail);
              return (
                <FadeIn key={i} delay={i} className="min-w-0 overflow-hidden rounded-3xl border border-line bg-surface text-center shadow-card">
                  <div className="relative overflow-hidden bg-brand px-3 py-4 text-brand-fg [--mark-hole:var(--brand)]">
                    <LogoOrnament className="absolute -left-6 -top-6 size-24 text-on-brand opacity-25" />
                    <p className="relative text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/75">{t("results.overall")}</p>
                    <p className="relative font-display text-5xl font-black tracking-tight">{r.score}</p>
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="truncate font-extrabold">{r.name}</p>
                    {bands ? (
                      <dl className="mt-3 grid grid-cols-4 gap-1">
                        {bands.map((b) => (
                          <div key={b.label} className="rounded-lg bg-brand-soft py-1.5">
                            <dt className="text-[10px] font-extrabold uppercase text-brand">{b.label}</dt>
                            <dd className="text-xs font-extrabold tabular-nums">{b.score}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-1 text-xs text-muted">{r.detail}</p>
                    )}
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn className="mt-16">
            <h3 className="mb-6 text-2xl font-extrabold sm:text-3xl">{t("testimonials.title")}</h3>
            <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
              {testimonials.map((item, i) => (
                <li key={i} className="relative flex w-[85%] shrink-0 snap-center flex-col rounded-3xl border border-line bg-surface p-6 shadow-card md:w-auto">
                  <span className="absolute -top-3 right-6 grid size-10 place-items-center rounded-full bg-brand text-brand-fg shadow-lg shadow-brand/30" aria-hidden>
                    <Quote className="size-4" fill="currentColor" />
                  </span>
                  <div className="flex gap-0.5 text-accent" aria-hidden>
                    {[0, 1, 2, 3, 4].map((n) => <Star key={n} className="size-4" fill="currentColor" />)}
                  </div>
                  <blockquote className="mt-3 flex-1 font-medium leading-relaxed text-fg/80">“{item.text}”</blockquote>
                  <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-extrabold text-brand">{initials(item.name)}</span>
                    <p className="min-w-0 leading-tight">
                      <span className="block truncate font-extrabold">{item.name}</span>
                      <span className="text-sm font-bold text-brand">{item.meta}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="savollar" className="scroll-mt-20 bg-surface py-12 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.7fr] lg:gap-14">
          <FadeIn className="lg:sticky lg:top-24 lg:self-start">
            <Eyebrow className="mb-4">{t("faq.eyebrow")}</Eyebrow>
            <h2 className="text-balance text-3xl font-extrabold sm:text-[2.75rem] sm:leading-[1.1]">{t("faq.title")}</h2>
            <div className="mt-8 hidden rounded-3xl bg-bg p-6 lg:block">
              <FaqContact title={t("faq.more")} text={t("faq.moreText")} contacts={contacts} />
            </div>
          </FadeIn>
          <div className="space-y-3">
            {faq.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-line bg-bg transition-colors open:border-brand open:bg-surface open:shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-extrabold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-lg leading-none text-brand transition group-open:rotate-45 group-open:bg-brand group-open:text-brand-fg">+</span>
                </summary>
                <p className="-mt-1 px-5 pb-5 leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
            <div className="rounded-3xl bg-bg p-5 lg:hidden">
              <FaqContact title={t("faq.more")} text={t("faq.moreText")} contacts={contacts} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Yakuniy chaqiriq ── */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <FadeIn className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-brand px-6 py-14 text-brand-fg shadow-2xl shadow-brand/30 [--mark-hole:var(--brand)] sm:px-12 sm:py-20">
          <LogoOrnament className="absolute -right-20 -top-20 size-80 animate-spin-slow text-on-brand opacity-25" />
          <div className="bg-dots absolute bottom-8 right-10 hidden h-24 w-40 text-white/25 sm:block" aria-hidden />
          <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-brand-deep/60 blur-3xl" aria-hidden />
          <h2 className="relative max-w-2xl text-balance text-3xl font-black sm:text-5xl sm:leading-[1.1]">{t("cta.title")}</h2>
          <p className="relative mt-4 max-w-xl text-pretty text-lg font-medium text-white/85">{t("cta.text")}</p>
          <ul className="relative mt-6 flex max-w-xl flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-white/90">
            {steps.map((s) => (
              <li key={s.title} className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4" />{s.title}</li>
            ))}
          </ul>
          <div className="relative mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/aloqa#ariza" size="lg" className="h-14 bg-white px-10 text-base text-brand shadow-lg shadow-black/20 hover:bg-white/90">
              {t("cta.button")} <ArrowRight className="size-5" />
            </ButtonLink>
            <a href={contacts.phoneHref} className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-white/40 px-7 font-display text-base font-extrabold tabular-nums transition-colors hover:border-white">
              <Phone className="size-5" fill="currentColor" /> {contacts.phone}
            </a>
          </div>
        </FadeIn>
      </section>
    </>
  );
}

function FaqContact({ title, text, contacts }: { title: string; text: string; contacts: ContactLinks }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <span className="grid size-11 place-items-center rounded-full bg-brand text-brand-fg"><MessageCircleQuestion className="size-6" /></span>
      <div>
        <p className="font-extrabold">{title}</p>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={contacts.phoneHref} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-bold text-brand-fg hover:bg-brand-hover">
          <Phone className="size-4" /> {contacts.phone}
        </a>
        <a href={contacts.telegramHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-bold hover:border-brand hover:text-brand">
          <Send className="size-4 text-brand" /> Telegram
        </a>
      </div>
    </div>
  );
}
