import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight, Check, CheckCircle2, Circle, Flame, MessageCircleQuestion, Phone, Play, PlayCircle, Quote, Send, Star,
  Target, Timer, TrendingUp, Trophy,
} from "lucide-react";
import { FadeIn } from "@/components/site/fade-in";
import { ButtonLink } from "@/components/ui/button";
import { SectionIcon } from "@/components/ui/section-icon";
import { faq, results, stats, teachers, testimonials } from "@/config/content";
import { siteConfig } from "@/config/site.config";
import { SECTIONS } from "@/lib/validation";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const ABOUT_ICONS = [Target, Timer, TrendingUp, Star];

function SectionTitle({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <FadeIn className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
      {eyebrow && <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>}
      <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-pretty text-lg text-muted">{text}</p>}
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

  // Qidiruv tizimlari uchun tuzilgan ma'lumot (SEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: siteConfig.fullName,
    address: siteConfig.address,
    telephone: siteConfig.phone,
    url: process.env.APP_URL,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute -left-40 -top-40 size-[32rem] rounded-full bg-brand/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-32 top-24 size-96 rounded-full bg-accent/20 blur-3xl" aria-hidden />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-4 pb-14 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:pb-20 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1 pr-3.5 text-sm font-bold shadow-sm backdrop-blur">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-brand-fg"><Play className="ml-0.5 size-3 fill-current" /></span>
              {t("hero.badge")}
            </span>
            <h1 className="mt-6 text-balance text-[2.5rem] font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-[4rem]">
              {t("hero.title", { score: "7.0+" })} <span className="highlight-marker text-brand">{t("hero.titleAccent")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted">{t("hero.text")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/aloqa#ariza" size="lg" variant="accent" className="h-14 px-8 text-base shadow-lg shadow-accent/25">
                {t("hero.cta")} <ArrowRight className="size-5" />
              </ButtonLink>
              <ButtonLink href="/kirish" size="lg" variant="outline" className="h-14 px-8 text-base">
                <PlayCircle className="size-5 text-brand" /> {t("hero.secondary")}
              </ButtonLink>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted">
              {points.map((p) => (
                <li key={p} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-success" strokeWidth={3} /> {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Kabinet ko'rinishidan namuna */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-[28rem]" aria-hidden>
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-brand/25 via-transparent to-accent/25 blur-2xl" />
            <div className="rounded-3xl border border-line bg-surface p-4 shadow-2xl shadow-brand/10 sm:p-5">
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-[#3b34b5] to-[#1e1b6b]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgb(255_255_255/0.22),transparent_55%)]" />
                <span className="absolute left-3 top-3 rounded-md bg-black/25 px-2 py-1 text-[11px] font-semibold text-white/90">{t("hero.cardModule")}</span>
                <span className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full bg-white text-brand shadow-xl">
                  <Play className="ml-1 size-7 fill-current" />
                </span>
                <div className="absolute inset-x-3 bottom-3 h-1 rounded-full bg-white/25">
                  <div className="h-full w-[64%] rounded-full bg-accent" />
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("hero.cardTitle")}</p>
                  <p className="mt-0.5 font-bold leading-snug">{t("hero.cardLesson")}</p>
                </div>
                <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">64%</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {cardLessons.map((lesson, i) => (
                  <li
                    key={lesson}
                    className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2", i === 1 ? "bg-brand-soft font-bold text-brand" : "text-muted")}
                  >
                    {i === 0 ? <CheckCircle2 className="size-4 text-success" /> : i === 1 ? <PlayCircle className="size-4" /> : <Circle className="size-4" />}
                    {lesson}
                  </li>
                ))}
              </ul>
            </div>
            <div className="absolute -left-2 -top-5 flex -rotate-3 items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg shadow-xl sm:-left-8">
              <Flame className="size-5" fill="currentColor" /> {t("hero.cardStreak")}
            </div>
            <div className="absolute -bottom-6 -right-1 flex rotate-2 items-center gap-2.5 rounded-2xl border border-line bg-surface py-2 pl-2 pr-4 text-sm font-bold shadow-xl sm:-right-8">
              <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent-fg dark:text-accent"><Trophy className="size-4" /></span>
              {t("hero.cardAchievement")}
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <dl className="grid grid-cols-2 overflow-hidden rounded-3xl border border-line bg-surface shadow-card sm:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "flex flex-col-reverse items-center gap-1 border-line px-3 py-5 text-center sm:py-7",
                  i % 2 === 1 && "border-l border-line",
                  i < 2 && "border-b border-line sm:border-b-0",
                  i === 2 && "sm:border-l",
                )}
              >
                <dt className="text-sm font-medium text-muted">{s.label}</dt>
                <dd className="text-3xl font-extrabold tracking-tight text-brand sm:text-4xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Markaz haqida ── */}
      <section id="haqida" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={t("about.eyebrow")} title={t("about.title")} text={t("about.text")} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {about.map((item, i) => {
              const Icon = ABOUT_ICONS[i % ABOUT_ICONS.length];
              return (
                <FadeIn key={item.title} delay={i} className="flex gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:flex-col sm:gap-5 sm:p-6">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon className="size-6" /></span>
                  <div>
                    <h3 className="text-lg font-bold leading-snug">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Kurslar ── */}
      <section id="kurslar" className="scroll-mt-20 border-y border-line bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={t("courses.eyebrow")} title={t("courses.title")} text={t("courses.text")} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {SECTIONS.map((s, i) => (
              <FadeIn
                key={s}
                delay={i % 3}
                className="group flex gap-4 rounded-2xl border border-line bg-bg p-5 transition-colors hover:border-brand/40 sm:flex-col sm:gap-5 sm:p-6"
              >
                <SectionIcon section={s} className="size-12 rounded-2xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" iconClassName="size-6" />
                <div>
                  <h3 className="text-xl font-extrabold">{ts(s)}</h3>
                  <p className="mt-1.5 text-muted">{t(`courses.${s}`)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qanday boshlanadi ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={t("steps.eyebrow")} title={t("steps.title")} />
          <ol className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
            {steps.map((step, i) => (
              <li key={step.title}>
                <FadeIn delay={i} className="flex h-full gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card md:flex-col md:items-center md:gap-5 md:p-7 md:text-center">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-lg font-extrabold text-accent-fg shadow-lg shadow-accent/30">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{step.title}</h3>
                    <p className="mt-1.5 text-muted">{step.text}</p>
                  </div>
                </FadeIn>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Ustozlar ── */}
      <section id="ustozlar" className="scroll-mt-20 border-y border-line bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={t("teachers.eyebrow")} title={t("teachers.title")} text={t("teachers.text")} />
          {/* Telefonda — yonga suriladigan karusel, kattaroq ekranda — to'r */}
          <FadeIn>
            <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3">
              {teachers.map((teacher, i) => (
                <li key={i} className="w-[80%] shrink-0 snap-center rounded-3xl border border-line bg-bg p-6 text-center sm:w-auto">
                  <span className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-brand to-accent p-1">
                    <span className="grid size-full place-items-center rounded-full bg-surface text-2xl font-extrabold text-brand">
                      {initials(teacher.name)}
                    </span>
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{teacher.name}</h3>
                  <p className="text-sm font-semibold text-brand">{teacher.role}</p>
                  <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent-fg dark:text-accent">
                    <Star className="size-4" fill="currentColor" /> IELTS {teacher.score}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{teacher.bio}</p>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* ── Natijalar ── */}
      <section id="natijalar" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={t("results.eyebrow")} title={t("results.title")} text={t("results.text")} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {results.map((r, i) => {
              const bands = parseBands(r.detail);
              return (
                <FadeIn key={i} delay={i} className="min-w-0 rounded-2xl border border-line bg-surface p-4 text-center shadow-card sm:p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{t("results.overall")}</p>
                  <p className="mt-1 text-5xl font-extrabold tracking-tight text-brand">{r.score}</p>
                  <p className="mt-2 truncate font-bold">{r.name}</p>
                  {bands ? (
                    <dl className="mt-3 grid grid-cols-4 gap-1">
                      {bands.map((b) => (
                        <div key={b.label} className="rounded-lg bg-surface-2 py-1.5">
                          <dt className="text-[10px] font-bold uppercase text-muted">{b.label}</dt>
                          <dd className="text-xs font-extrabold tabular-nums">{b.score}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-1 text-xs text-muted">{r.detail}</p>
                  )}
                </FadeIn>
              );
            })}
          </div>

          <FadeIn className="mt-16">
            <h3 className="mb-6 text-center text-2xl font-extrabold tracking-tight">{t("testimonials.title")}</h3>
            <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
              {testimonials.map((item, i) => (
                <li key={i} className="relative flex w-[85%] shrink-0 snap-center flex-col rounded-2xl border border-line bg-surface p-6 shadow-card md:w-auto">
                  <Quote className="absolute right-5 top-5 size-8 text-brand/15" fill="currentColor" aria-hidden />
                  <div className="flex gap-0.5 text-accent" aria-hidden>
                    {[0, 1, 2, 3, 4].map((n) => <Star key={n} className="size-4" fill="currentColor" />)}
                  </div>
                  <blockquote className="mt-3 flex-1 leading-relaxed text-muted">“{item.text}”</blockquote>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-extrabold text-brand">{initials(item.name)}</span>
                    <p className="min-w-0 leading-tight">
                      <span className="block truncate font-bold">{item.name}</span>
                      <span className="text-sm font-semibold text-brand">{item.meta}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="savollar" className="scroll-mt-20 border-y border-line bg-surface py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.7fr] lg:gap-14">
          <FadeIn className="text-center lg:sticky lg:top-24 lg:self-start lg:text-left">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-brand">{t("faq.eyebrow")}</p>
            <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{t("faq.title")}</h2>
            <div className="mt-8 hidden rounded-2xl border border-line bg-bg p-5 lg:block">
              <FaqContact title={t("faq.more")} text={t("faq.moreText")} />
            </div>
          </FadeIn>
          <div className="space-y-3">
            {faq.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-line bg-bg transition-colors open:border-brand/40 open:bg-surface open:shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-lg leading-none text-brand transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="-mt-1 px-5 pb-5 leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
            <div className="rounded-2xl border border-dashed border-line p-5 lg:hidden">
              <FaqContact title={t("faq.more")} text={t("faq.moreText")} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Yakuniy chaqiriq ── */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <FadeIn className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-brand px-6 py-14 text-center text-brand-fg shadow-2xl shadow-brand/25 sm:px-12 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(255_255_255/0.18),transparent_50%)]" aria-hidden />
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10" aria-hidden />
          <div className="absolute -bottom-24 -left-10 size-72 rounded-full bg-accent/30 blur-3xl" aria-hidden />
          <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">{t("cta.title")}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-pretty text-lg text-white/85">{t("cta.text")}</p>
          <ul className="relative mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-white/90">
            {steps.map((s) => (
              <li key={s.title} className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-accent" />{s.title}</li>
            ))}
          </ul>
          <ButtonLink href="/aloqa#ariza" size="lg" variant="accent" className="relative mt-9 h-14 px-10 text-base shadow-lg shadow-black/20">
            {t("cta.button")} <ArrowRight className="size-5" />
          </ButtonLink>
        </FadeIn>
      </section>
    </>
  );
}

function FaqContact({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
      <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><MessageCircleQuestion className="size-6" /></span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <a href={siteConfig.phoneHref} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-fg hover:bg-brand-hover">
          <Phone className="size-4" /> {siteConfig.phone}
        </a>
        <a href={siteConfig.telegramHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2">
          <Send className="size-4 text-brand" /> Telegram
        </a>
      </div>
    </div>
  );
}
