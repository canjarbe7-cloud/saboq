import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/admin-shell";
import { EnrollmentEditor, SessionList } from "@/components/admin/student-access";
import { EditStudentForm, StudentSecurityActions } from "@/components/admin/student-forms";
import { Badge, Card, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { getStudentDetail } from "@/server/services/students";
import { formatDate, timeAgo, toDateInput } from "@/lib/format";
import { ageFrom } from "@/lib/validation";

const loadStudent = cache(getStudentDetail);

export async function generateMetadata({ params }: PageProps<"/admin/oquvchilar/[id]">): Promise<Metadata> {
  await requireAdmin();
  return { title: (await loadStudent((await params).id))?.user.name ?? "O‘quvchi" };
}

export default async function StudentPage({ params }: PageProps<"/admin/oquvchilar/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [detail, groups, t, tp] = await Promise.all([
    loadStudent(id),
    db.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getTranslations("admin.students"),
    getTranslations("student.profile"),
  ]);
  if (!detail) notFound();
  const { user, courses } = detail;
  // O'quvchi profilida o'zi to'ldiradigan ma'lumotlar
  const profile = [
    [tp("birthDate"), user.birthDate && `${formatDate(user.birthDate)} (${ageFrom(user.birthDate)})`],
    [tp("gender"), user.gender && tp(user.gender)],
    [tp("region"), user.region],
    [tp("email"), user.email && <a href={`mailto:${user.email}`} className="text-brand hover:underline">{user.email}</a>],
    [tp("telegram"), user.telegram && (
      <a href={`https://t.me/${user.telegram}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">@{user.telegram}</a>
    )],
  ] as const;

  return (
    <>
      <PageHeader title={user.name} back={{ href: "/admin/oquvchilar", label: t("title") }} />
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted">
        <Badge tone={user.status === "ACTIVE" ? "success" : "danger"}>
          {user.status === "ACTIVE" ? t("statusActive") : t("statusBlocked")}
        </Badge>
        {user.mustChangePassword && <Badge tone="accent">{t("tempPassword")}</Badge>}
        <span>{t("createdAt", { date: formatDate(user.createdAt) })}</span>
        <span>·</span>
        <span>{user.lastLoginAt ? t("lastLogin", { date: timeAgo(user.lastLoginAt) }) : t("neverLoggedIn")}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardTitle>{t("courses")}</CardTitle>
            <EnrollmentEditor
              userId={user.id}
              courses={courses}
              initial={Object.fromEntries(user.enrollments.map((e) => [e.courseId, e.expiresAt ? toDateInput(e.expiresAt) : ""]))}
            />
          </Card>
          <Card>
            <CardTitle>{t("sessions")}</CardTitle>
            <SessionList
              userId={user.id}
              max={env.SESSION_MAX_DEVICES}
              sessions={user.sessions.map((s) => ({ id: s.id, userAgent: s.userAgent, ip: s.ip, lastSeenAt: s.lastSeenAt.toISOString() }))}
            />
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle>{t("info")}</CardTitle>
            <EditStudentForm
              id={user.id}
              groups={groups}
              initial={{ name: user.name, phone: user.phone, username: user.username, groupId: user.groupId ?? "", note: user.note ?? "" }}
            />
          </Card>
          <Card>
            <CardTitle>{tp("personal")}</CardTitle>
            <dl className="divide-y divide-line text-sm">
              {profile.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className={value ? "truncate font-semibold" : "text-muted"}>{value || tp("notSet")}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardTitle>{t("security")}</CardTitle>
            <StudentSecurityActions id={user.id} blocked={user.status === "BLOCKED"} />
          </Card>
        </div>
      </div>
    </>
  );
}
