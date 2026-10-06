import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpen, Flame, Inbox, PlayCircle, ShieldOff, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/admin-shell";
import { Badge, Card, CardTitle, EmptyState } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatDate, timeAgo } from "@/lib/format";
import { formatPhone } from "@/lib/validation";

export default async function AdminDashboard() {
  await requireAdmin();
  const t = await getTranslations("admin.dashboard");
  const tApp = await getTranslations("admin.applications");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const weekAhead = new Date(now.getTime() + 7 * 86400_000);

  const [total, active, blocked, newApps, publishedCourses, top, recentApps, expiring] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({
      where: {
        role: "STUDENT", status: "ACTIVE",
        OR: [{ sessions: { some: { lastSeenAt: { gte: weekAgo } } } }, { lastLoginAt: { gte: weekAgo } }],
      },
    }),
    db.user.count({ where: { role: "STUDENT", status: "BLOCKED" } }),
    db.application.count({ where: { status: "NEW" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.lessonProgress.groupBy({ by: ["lessonId"], _count: { lessonId: true }, orderBy: { _count: { lessonId: "desc" } }, take: 5 }),
    db.application.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.enrollment.findMany({
      where: { expiresAt: { gte: now, lte: weekAhead }, user: { status: "ACTIVE" } },
      orderBy: { expiresAt: "asc" },
      take: 6,
      select: { id: true, expiresAt: true, user: { select: { id: true, name: true } }, course: { select: { title: true } } },
    }),
  ]);

  const topLessons = await db.lesson.findMany({
    where: { id: { in: top.map((x) => x.lessonId) } },
    select: { id: true, title: true, module: { select: { course: { select: { title: true } } } } },
  });
  const ranked = top.map((x) => ({ count: x._count.lessonId, lesson: topLessons.find((l) => l.id === x.lessonId) })).filter((x) => x.lesson);

  const stats = [
    { label: t("totalStudents"), value: total, icon: Users, href: "/admin/oquvchilar", tone: "bg-brand-soft text-brand" },
    { label: t("activeStudents"), hint: t("activeHint"), value: active, icon: Flame, href: "/admin/oquvchilar?status=ACTIVE", tone: "bg-success-soft text-success" },
    { label: t("newApplications"), value: newApps, icon: Inbox, href: "/admin/arizalar", tone: "bg-accent-soft text-accent-fg dark:text-accent" },
    { label: t("courses"), value: publishedCourses, icon: BookOpen, href: "/admin/kurslar", tone: "bg-brand-soft text-brand" },
    ...(blocked ? [{ label: t("blockedStudents"), value: blocked, icon: ShieldOff, href: "/admin/oquvchilar?status=BLOCKED", tone: "bg-danger-soft text-danger" }] : []),
  ];

  return (
    <>
      <PageHeader title={t("title")} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group rounded-2xl border border-line bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <span className={`grid size-10 place-items-center rounded-xl ${s.tone}`}>
              <s.icon className="size-5" />
            </span>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{s.value}</p>
            <p className="text-sm font-medium text-muted">{s.label}</p>
            {s.hint && <p className="text-xs text-muted/80">{s.hint}</p>}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("topLessons")}</CardTitle>
          {ranked.length === 0 ? (
            <EmptyState icon={<PlayCircle className="size-7" />} title={t("topLessonsEmpty")} text={t("topLessonsEmptyText")} />
          ) : (
            <ol className="space-y-3">
              {ranked.map(({ lesson, count }, i) => (
                <li key={lesson!.id} className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm font-bold">{i + 1}</span>
                  <Link href={`/admin/darslar/${lesson!.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="truncate font-semibold">{lesson!.title}</p>
                    <p className="truncate text-xs text-muted">{lesson!.module.course.title}</p>
                  </Link>
                  <Badge tone="brand">{t("viewers", { count })}</Badge>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <CardTitle action={<Link href="/admin/arizalar" className="text-sm font-semibold text-brand hover:underline">{t("seeAll")}</Link>}>
            {t("recentApplications")}
          </CardTitle>
          {recentApps.length === 0 ? (
            <EmptyState icon={<Inbox className="size-7" />} title={t("noApplications")} text={t("noApplicationsText")} />
          ) : (
            <ul className="divide-y divide-line">
              {recentApps.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.name}</p>
                    <p className="text-xs text-muted">{tApp(`levels.${a.level}` as "levels.unknown")} · {timeAgo(a.createdAt)}</p>
                  </div>
                  <a href={`tel:${a.phone}`} className="shrink-0 text-sm font-semibold text-brand hover:underline">{formatPhone(a.phone)}</a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>{t("expiringSoon")}</CardTitle>
          {expiring.length === 0 ? (
            <p className="text-sm text-muted">{t("expiringSoonEmpty")}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {expiring.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/oquvchilar/${e.user.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5 hover:bg-brand-soft">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{e.user.name}</span>
                      <span className="block truncate text-xs text-muted">{e.course.title}</span>
                    </span>
                    <Badge tone="accent">{t("expiresOn", { date: formatDate(e.expiresAt!) })}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
