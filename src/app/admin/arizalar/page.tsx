import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/admin/admin-shell";
import { ApplicationRow } from "@/components/admin/application-row";
import { EmptyState } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Arizalar" };

const STATUSES = ["NEW", "CONTACTED", "CLOSED"] as const;

export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/arizalar">) {
  await requireAdmin();
  const t = await getTranslations("admin.applications");
  const tc = await getTranslations("common");
  const raw = (await searchParams).status;
  const status = STATUSES.find((s) => s === raw);

  const [apps, counts] = await Promise.all([
    db.application.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 200 }),
    db.application.groupBy({ by: ["status"], _count: { status: true } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count.status ?? 0;
  const tabs = [
    { href: "/admin/arizalar", label: tc("all"), count: counts.reduce((n, c) => n + c._count.status, 0), active: !status },
    ...STATUSES.map((s) => ({ href: `/admin/arizalar?status=${s}`, label: t(`status${s}`), count: countOf(s), active: status === s })),
  ];

  return (
    <>
      <PageHeader title={t("title")} />
      <nav className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <Link
            key={tab.href} href={tab.href}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              tab.active ? "bg-brand text-brand-fg" : "bg-surface text-muted ring-1 ring-line hover:text-fg",
            )}
          >
            {tab.label} <span className="opacity-70">{tab.count}</span>
          </Link>
        ))}
      </nav>
      {apps.length === 0 ? (
        <EmptyState icon={<Inbox className="size-7" />} title={t("empty")} text={t("emptyText")} />
      ) : (
        <ul className="space-y-3">
          {apps.map((a) => (
            <ApplicationRow key={a.id} app={{ id: a.id, name: a.name, phone: a.phone, level: a.level, status: a.status, note: a.note, createdAt: a.createdAt.toISOString() }} />
          ))}
        </ul>
      )}
    </>
  );
}
