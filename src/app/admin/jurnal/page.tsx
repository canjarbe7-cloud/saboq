import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { History } from "lucide-react";
import { PageHeader } from "@/components/admin/admin-shell";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Jurnal" };

const PER_PAGE = 50;

/** details ichidan o'qishga qulay qisqa matn (nom, login va h.k.). */
function summarize(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const d = details as Record<string, unknown>;
  return [d.name, d.title, d.username && `@${d.username}`, d.status].filter(Boolean).join(" · ");
}

export default async function AuditPage({ searchParams }: PageProps<"/admin/jurnal">) {
  await requireAdmin();
  const t = await getTranslations("admin.audit");
  const tc = await getTranslations("common");
  const page = Math.min(10_000, Math.max(1, Math.floor(Number((await searchParams).page)) || 1));

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { actor: { select: { name: true } } },
    }),
    db.auditLog.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  // Tarjima kalitlarida nuqta bo'lmaydi: "student.create" → "student_create"
  const actionLabel = (action: string) => {
    const key = `actions.${action.replace(".", "_")}`;
    return t.has(key) ? t(key as "actions.course_create") : action;
  };

  return (
    <>
      <PageHeader title={t("title")} />
      {logs.length === 0 ? (
        <EmptyState icon={<History className="size-7" />} title={t("empty")} text={t("emptyText")} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {logs.map((log) => (
            <li key={log.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="w-40 shrink-0 text-xs tabular-nums text-muted">{formatDateTime(log.createdAt)}</span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{actionLabel(log.action)}</span>
                {summarize(log.details) && <span className="text-muted"> — {summarize(log.details)}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted">{log.actor?.name ?? t("deletedUser")} · {log.ip}</span>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between">
          {page > 1 ? <ButtonLink href={`/admin/jurnal?page=${page - 1}`} variant="outline" size="sm">← {tc("prev")}</ButtonLink> : <span />}
          <span className="text-sm text-muted">{page} / {pages}</span>
          {page < pages ? <ButtonLink href={`/admin/jurnal?page=${page + 1}`} variant="outline" size="sm">{tc("next")} →</ButtonLink> : <span />}
        </nav>
      )}
    </>
  );
}
