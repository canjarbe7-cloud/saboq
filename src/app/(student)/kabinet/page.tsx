import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, CheckCircle2, Flame, Lock, PlayCircle } from "lucide-react";
import { InstallBanner } from "@/components/pwa/install-app";
import { Badge, EmptyState, ProgressBar } from "@/components/ui/card";
import { LogoOrnament } from "@/components/ui/logo";
import { SectionIcon } from "@/components/ui/section-icon";
import { requireStudent } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getStreak, getStudentCourses } from "@/server/services/learning";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getContacts } from "@/server/services/site-content";

export default async function StudentHome() {
  const { user } = await requireStudent();
  const [courses, streak, owned, t, ts] = await Promise.all([
    getStudentCourses(user.id),
    getStreak(user.id),
    db.userAchievement.findMany({ where: { userId: user.id }, select: { code: true } }),
    getTranslations("student"),
    getTranslations("sections"),
  ]);
  const have = new Set(owned.map((o) => o.code));
  const contacts = await getContacts();

  // "Davom ettirish": oxirgi faol bo'lgan, hali tugamagan ochiq kurs
  const resume = courses
    .filter((c) => c.access === "ok" && c.nextLesson)
    .sort((a, b) => b.lastActivity - a.lastActivity)[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("home.greeting", { name: user.name.split(" ")[0] })}</h1>
        <p className="mt-1 text-muted">{t("home.subtitle")}</p>
      </div>

      <InstallBanner />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {resume && (
          <Link
            href={`/kabinet/darslar/${resume.nextLesson!.id}`}
            className="group relative overflow-hidden rounded-3xl bg-brand p-5 text-brand-fg shadow-xl shadow-brand/30 transition-transform hover:-translate-y-0.5 sm:p-6 lg:col-span-2"
          >
            <LogoOrnament className="absolute -right-12 -top-14 size-64 text-on-brand opacity-25 [--mark-hole:var(--brand)]" />
            <div className="bg-dots absolute bottom-4 right-6 h-16 w-28 text-white/25" aria-hidden />
            <p className="relative text-sm font-semibold text-white/75">{resume.lastActivity ? t("home.continueTitle") : t("home.startTitle")}</p>
            <p className="relative mt-1 text-balance text-xl font-extrabold sm:text-2xl">{resume.nextLesson!.title}</p>
            <div className="relative mt-4 max-w-md">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm text-white/80">
                <span className="truncate">{resume.title}</span>
                <span className="font-bold tabular-nums text-white">{resume.percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${resume.percent}%` }} />
              </div>
            </div>
            <span className="relative mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-brand shadow-lg shadow-black/10">
              <PlayCircle className="size-5" />
              {resume.lastActivity ? t("home.continue") : t("home.start")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        )}

        <div className={cn("flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6", !resume && "lg:col-span-3")}>
          <span className={cn("grid size-16 shrink-0 place-items-center rounded-2xl", streak > 0 ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted")}>
            <Flame className="size-9" fill={streak > 0 ? "currentColor" : "none"} />
          </span>
          <div>
            <p className="text-xl font-extrabold">{t("streak.title", { count: streak })}</p>
            <p className="text-sm text-muted">{streak > 0 ? t("streak.text") : t("streak.text0")}</p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">{t("home.myCourses")}</h2>
        {courses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-7" />} title={t("home.noCourses")} text={t("home.noCoursesText")}
            action={<a href={contacts.phoneHref} className="font-bold text-brand hover:underline">{contacts.phone}</a>}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const expired = c.access === "expired";
              return (
                <li key={c.id}>
                  <Link
                    href={`/kabinet/kurslar/${c.slug}`}
                    className={cn(
                      "flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-1 hover:border-brand",
                      expired && "opacity-75",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <SectionIcon section={c.section} className="size-12 rounded-2xl" iconClassName="size-6" />
                      {expired ? (
                        <Badge tone="danger"><Lock className="size-3" /> {t("home.expired")}</Badge>
                      ) : c.percent === 100 ? (
                        <Badge tone="success"><CheckCircle2 className="size-3" /> {t("home.completedCourse")}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">{ts(c.section)}</p>
                    <p className="mt-0.5 text-lg font-bold leading-snug">{c.title}</p>
                    {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>}
                    <div className="mt-auto pt-4">
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="text-muted">{t("home.lessons", { done: c.completed, total: c.total })}</span>
                        <span className="font-bold tabular-nums">{c.percent}%</span>
                      </div>
                      <ProgressBar percent={c.percent} />
                      {!expired && c.expiresAt && (
                        <p className="mt-2 text-xs text-muted">{t("home.expiresOn", { date: formatDate(c.expiresAt) })}</p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">{t("achievements.title")}</h2>
        <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {ACHIEVEMENTS.map((a) => {
            const earned = have.has(a.code);
            return (
              <li
                key={a.code}
                title={earned ? t(`achievements.${a.code}_text`) : t("achievements.locked")}
                className={cn(
                  "flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-3 text-center",
                  earned ? "border-accent/40 bg-accent-soft" : "border-line bg-surface",
                )}
              >
                {/* Olinmagan nishon: faqat rasm xira, yozuv o'qiladigan bo'lib qoladi */}
                <span className={cn("text-3xl", !earned && "opacity-40 grayscale")}>{a.emoji}</span>
                <span className={cn("text-xs font-bold leading-tight", !earned && "text-muted")}>{t(`achievements.${a.code}`)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {!resume && courses.some((c) => c.access === "ok" && c.total > 0) && (
        <p className="rounded-2xl bg-success-soft p-4 text-center font-semibold text-success">{t("home.allDone")}</p>
      )}
    </div>
  );
}
