import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CalendarCheck, Check, X } from "lucide-react";
import { AttendanceScanner } from "@/components/student/attendance-scanner";
import { EmptyState } from "@/components/ui/card";
import { requireStudent } from "@/server/auth/guards";
import { getStudentAttendance } from "@/server/services/attendance";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Davomat" };

/**
 * O'quvchi darsga kelganini tasdiqlaydigan sahifa. Ikki yo'l bilan ishlaydi:
 *  1) shu sahifadagi "Skanerlash" tugmasi (kamera sayt ichida ochiladi);
 *  2) telefonning oddiy kamerasi — QR ichidagi havola shu sahifani `?c=<kod>` bilan ochadi.
 */
export default async function StudentAttendancePage({ searchParams }: PageProps<"/kabinet/davomat">) {
  const { user } = await requireStudent();
  const raw = (await searchParams).c;
  const code = typeof raw === "string" && raw.length <= 120 ? raw : undefined;
  const [t, { records, present, absent }] = await Promise.all([getTranslations("student.attendance"), getStudentAttendance(user.id)]);
  const total = present + absent;

  const stats = [
    { label: t("statPresent"), value: present, tone: "text-success" },
    { label: t("statAbsent"), value: absent, tone: "text-danger" },
    { label: t("statRate"), value: total ? `${Math.round((present / total) * 100)}%` : "—", tone: "text-brand" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>

      <AttendanceScanner initialCode={code} />

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-3 text-center shadow-card sm:p-4">
            <dd className={cn("font-display text-2xl font-black tabular-nums sm:text-3xl", s.tone)}>{s.value}</dd>
            <dt className="mt-0.5 text-xs font-bold text-muted sm:text-sm">{s.label}</dt>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">{t("history")}</h2>
        {records.length === 0 ? (
          <EmptyState icon={<CalendarCheck className="size-7" />} title={t("empty")} text={t("emptyText")} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
            {records.map((r) => {
              const here = r.status === "PRESENT";
              return (
                <li key={r.session.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", here ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                    {here ? <Check className="size-5" strokeWidth={3} /> : <X className="size-5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{r.session.title}</span>
                    <span className="block text-sm tabular-nums text-muted">{formatDateTime(r.session.startedAt)}</span>
                  </span>
                  <span className={cn("shrink-0 text-sm font-extrabold", here ? "text-success" : "text-danger")}>{here ? t("present") : t("absent")}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
