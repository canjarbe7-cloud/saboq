import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Activity, BadgeCheck, CalendarDays, Flame, MonitorSmartphone, ShieldCheck, Trophy, UserRound } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { LogoutOthersButton } from "@/components/student/logout-others";
import { ContactRow, PersonalInfoCard } from "@/components/student/profile-editor";
import { Badge, Card } from "@/components/ui/card";
import { requireStudent } from "@/server/auth/guards";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { getActivityOverview } from "@/server/services/learning";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { describeDevice, formatDate, timeAgo } from "@/lib/format";
import { ageFrom, formatPhone } from "@/lib/validation";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Profil" };

const TABS = [
  { key: "info", icon: UserRound },
  { key: "activity", icon: Activity },
  { key: "devices", icon: MonitorSmartphone },
  { key: "security", icon: ShieldCheck },
] as const;
type Tab = (typeof TABS)[number]["key"];

const WEEKS = 18;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-muted first:mt-0">{children}</h2>;
}

export default async function StudentProfilePage({ searchParams }: PageProps<"/kabinet/profil">) {
  const { user: sessionUser, session } = await requireStudent();
  const raw = (await searchParams).tab;
  const tab: Tab = TABS.find((x) => x.key === raw)?.key ?? "info";
  const t = await getTranslations();
  const tp = await getTranslations("student.profile");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{tp("title")}</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:self-start lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-2 lg:shadow-card">
          {TABS.map(({ key, icon: Icon }) => (
            <Link
              key={key} href={key === "info" ? "/kabinet/profil" : `/kabinet/profil?tab=${key}`} aria-current={tab === key ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors lg:py-3",
                tab === key ? "bg-brand-soft text-brand" : "bg-surface text-muted ring-1 ring-line hover:text-fg lg:bg-transparent lg:ring-0 lg:hover:bg-surface-2",
              )}
            >
              <Icon className="size-5" />
              {tp(`tabs.${key}`)}
            </Link>
          ))}
        </nav>

        <div className="min-w-0">
          {tab === "info" && <InfoTab userId={sessionUser.id} />}
          {tab === "activity" && <ActivityTab userId={sessionUser.id} />}
          {tab === "devices" && <DevicesTab userId={sessionUser.id} sessionId={session.id} />}
          {tab === "security" && (
            <Card className="max-w-lg">
              <h2 className="text-lg font-bold">{t("auth.changePassword")}</h2>
              <p className="mb-4 mt-1 text-sm text-muted">{tp("securityHint")}</p>
              <ChangePasswordForm mode="profile" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

async function InfoTab({ userId }: { userId: string }) {
  const tp = await getTranslations("student.profile");
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, username: true, phone: true, birthDate: true, gender: true, region: true, email: true, telegram: true },
  });
  const badges = [
    user.birthDate && tp("age", { age: ageFrom(user.birthDate) }),
    user.gender && tp(user.gender),
    user.region,
  ].filter((b): b is string => Boolean(b));

  return (
    <div className="max-w-3xl">
      <SectionTitle>{tp("personal")}</SectionTitle>
      <div className="space-y-4">
        <PersonalInfoCard
          name={user.name} username={user.username} badges={badges}
          initial={{ birthDate: user.birthDate?.toISOString().slice(0, 10) ?? "", gender: user.gender ?? "", region: user.region ?? "" }}
        />
        <Card>
          <p className="font-bold">{tp("phone")}</p>
          <p className="mt-1 text-base">{formatPhone(user.phone)}</p>
          <p className="mt-2 text-xs text-muted">{tp("phoneHint")}</p>
        </Card>
      </div>

      <SectionTitle>{tp("accounts")}</SectionTitle>
      <div className="space-y-4">
        <ContactRow field="email" value={user.email} />
        <ContactRow field="telegram" value={user.telegram} />
      </div>
    </div>
  );
}

async function ActivityTab({ userId }: { userId: string }) {
  const [tp, ta, overview, owned] = await Promise.all([
    getTranslations("student.profile"),
    getTranslations("student.achievements"),
    getActivityOverview(userId, WEEKS),
    db.userAchievement.findMany({ where: { userId }, select: { code: true } }),
  ]);
  const have = new Set(owned.map((o) => o.code));
  const stats = [
    { label: tp("statLessons"), value: overview.completedLessons, icon: BadgeCheck, tone: "bg-brand-soft text-brand" },
    { label: tp("statStreak"), value: overview.streak, icon: Flame, tone: "bg-accent-soft text-accent" },
    { label: tp("statDays"), value: overview.activeDays, icon: CalendarDays, tone: "bg-success-soft text-success" },
    { label: tp("statAchievements"), value: `${have.size}/${ACHIEVEMENTS.length}`, icon: Trophy, tone: "bg-accent-soft text-accent" },
  ];

  return (
    <div className="space-y-6">
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <li key={label} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tone)}><Icon className="size-6" /></span>
            <div className="min-w-0">
              <p className="text-xl font-extrabold tabular-nums">{value}</p>
              <p className="truncate text-xs text-muted">{label}</p>
            </div>
          </li>
        ))}
      </ul>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{tp("tabs.activity")}</h2>
          <span className="text-sm text-muted">{tp("calendar", { weeks: WEEKS })}</span>
        </div>
        <div className="overflow-x-auto pb-1">
          {/* Har bir ustun — bitta hafta (dushanbadan yakshanbagacha) */}
          <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
            {overview.days.map((d) => (
              <span
                key={d.date}
                title={d.future ? undefined : tp(d.active ? "activeDay" : "inactiveDay", { date: formatDate(d.date) })}
                className={cn("size-3.5 rounded-[4px] sm:size-4", d.future ? "bg-transparent" : d.active ? "bg-brand" : "bg-surface-2")}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted">
          {tp("less")}
          <span className="size-3 rounded-[3px] bg-surface-2" />
          <span className="size-3 rounded-[3px] bg-brand" />
          {tp("more")}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold">{ta("title")}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const earned = have.has(a.code);
            return (
              <li
                key={a.code}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3",
                  earned ? "border-accent/40 bg-accent-soft" : "border-line",
                )}
              >
                <span className={cn("text-3xl", !earned && "opacity-40 grayscale")}>{a.emoji}</span>
                <div className="min-w-0">
                  <p className={cn("text-sm font-bold leading-tight", !earned && "text-muted")}>{ta(a.code)}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted">{earned ? ta(`${a.code}_text`) : ta("locked")}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

async function DevicesTab({ userId, sessionId }: { userId: string; sessionId: string }) {
  const tp = await getTranslations("student.profile");
  const sessions = await db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, lastSeenAt: true },
  });

  return (
    <Card className="max-w-3xl">
      <h2 className="text-lg font-bold">{tp("devices")}</h2>
      <p className="mb-4 mt-1 text-sm text-muted">{tp("devicesHint", { max: env.SESSION_MAX_DEVICES })}</p>
      <ul className="mb-4 space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3">
            <MonitorSmartphone className="size-6 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{describeDevice(s.userAgent)}</p>
              <p className="text-xs text-muted">{tp("lastSeen", { date: timeAgo(s.lastSeenAt) })}</p>
            </div>
            {s.id === sessionId && <Badge tone="success">{tp("thisDevice")}</Badge>}
          </li>
        ))}
      </ul>
      {sessions.length > 1 && <LogoutOthersButton />}
    </Card>
  );
}
