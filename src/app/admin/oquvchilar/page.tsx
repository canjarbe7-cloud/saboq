import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/admin-shell";
import { CreateStudentButton } from "@/components/admin/student-forms";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { listStudents } from "@/server/services/students";
import { timeAgo } from "@/lib/format";
import { formatPhone } from "@/lib/validation";

export const metadata: Metadata = { title: "O‘quvchilar" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function StudentsPage({ searchParams }: PageProps<"/admin/oquvchilar">) {
  await requireAdmin();
  const t = await getTranslations("admin.students");
  const tc = await getTranslations("common");
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  const groupId = one(sp.group);
  const statusRaw = one(sp.status);
  const status = statusRaw === "ACTIVE" || statusRaw === "BLOCKED" ? statusRaw : undefined;
  const page = Number(one(sp.page)) || 1;

  const [groups, result] = await Promise.all([
    db.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listStudents({ q, groupId, status, page }),
  ]);
  const filtered = Boolean(q || groupId || status);
  const now = new Date();

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (groupId) params.set("group", groupId);
    if (status) params.set("status", status);
    params.set("page", String(p));
    return `/admin/oquvchilar?${params}`;
  };

  const selectClass = "h-11 min-w-0 rounded-xl border border-line bg-surface px-3 text-sm";

  return (
    <>
      <PageHeader title={t("title")} action={<CreateStudentButton groups={groups} />} />

      <form className="mb-5 grid grid-cols-2 gap-2 sm:flex" role="search">
        <div className="relative col-span-2 sm:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} aria-label={tc("search")}
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
        </div>
        <select name="group" defaultValue={groupId ?? ""} className={selectClass} aria-label={t("group")}>
          <option value="">{t("allGroups")}</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ""} className={selectClass} aria-label={t("allStatuses")}>
          <option value="">{t("allStatuses")}</option>
          <option value="ACTIVE">{t("statusActive")}</option>
          <option value="BLOCKED">{t("statusBlocked")}</option>
        </select>
        <Button type="submit" variant="outline" className="col-span-2">{tc("search")}</Button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState icon={<Users className="size-7" />} title={t("empty")} text={filtered ? t("emptySearch") : t("emptyText")} />
      ) : (
        <>
          <p className="mb-2 text-sm text-muted">{t("total", { count: result.total })}</p>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {result.items.map((s) => {
              const open = s.enrollments.filter((e) => !e.expiresAt || e.expiresAt > now).length;
              return (
                <li key={s.id}>
                  <Link href={`/admin/oquvchilar/${s.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand">
                      {s.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate font-semibold">{s.name}</span>
                        {s.status === "BLOCKED" && <Badge tone="danger">{t("statusBlocked")}</Badge>}
                        {s.mustChangePassword && <Badge tone="accent">{t("tempPassword")}</Badge>}
                        {s.group && <Badge>{s.group.name}</Badge>}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted sm:truncate">
                        @{s.username} · {formatPhone(s.phone)}
                      </span>
                      <span className="block truncate text-xs text-muted/80">
                        {open ? t("coursesCount", { count: open }) : t("noCourses")} ·{" "}
                        {s.lastLoginAt ? t("lastLogin", { date: timeAgo(s.lastLoginAt) }) : t("neverLoggedIn")}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {result.pages > 1 && (
            <nav className="mt-4 flex items-center justify-between" aria-label="Sahifalar">
              {result.page > 1 ? <ButtonLink href={pageHref(result.page - 1)} variant="outline" size="sm">← {tc("prev")}</ButtonLink> : <span />}
              <span className="text-sm text-muted">{result.page} / {result.pages}</span>
              {result.page < result.pages ? <ButtonLink href={pageHref(result.page + 1)} variant="outline" size="sm">{tc("next")} →</ButtonLink> : <span />}
            </nav>
          )}
        </>
      )}
    </>
  );
}
