import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, QrCode } from "lucide-react";
import { PageHeader } from "@/components/admin/admin-shell";
import { AttendanceStart } from "@/components/admin/attendance-start";
import { Badge, EmptyState } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { listSessions } from "@/server/services/attendance";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Davomat" };

export default async function AttendancePage() {
  await requireAdmin();
  const [t, groups, sessions] = await Promise.all([
    getTranslations("admin.attendance"),
    db.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { users: { where: { role: "STUDENT", status: "ACTIVE" } } } } } }),
    listSessions(),
  ]);

  return (
    <>
      <PageHeader title={t("title")} />
      <AttendanceStart groups={groups.map((g) => ({ id: g.id, name: g.name, members: g._count.users }))} />

      <h2 className="mb-3 mt-10 text-lg font-extrabold">{t("history")}</h2>
      {sessions.length === 0 ? (
        <EmptyState icon={<QrCode className="size-7" />} title={t("empty")} text={t("emptyText")} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/davomat/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-soft/50 sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{s.title}</span>
                  <span className="block text-sm tabular-nums text-muted">{formatDateTime(s.startedAt)}</span>
                </span>
                <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {s.open && <Badge tone="brand"><span className="size-1.5 animate-pulse rounded-full bg-brand" />{t("open")}</Badge>}
                  <Badge tone="success">{t("presentCount", { count: s.present })}</Badge>
                  {s.closed && <Badge tone="danger">{t("absentCount", { count: s.absent })}</Badge>}
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
