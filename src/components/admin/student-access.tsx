"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MonitorSmartphone } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge, ProgressBar } from "@/components/ui/card";
import { SectionBadge } from "@/components/ui/section-icon";
import { useAction } from "@/hooks/use-action";
import { revokeSessionAction, setEnrollmentsAction } from "@/server/actions/admin";
import { addMonths, describeDevice, timeAgo, toDateInput } from "@/lib/format";

type CourseRow = { id: string; title: string; section: string; status: string; total: number; completed: number; percent: number };
/** courseId → tugash sanasi ("" = muddatsiz). Ro'yxatda yo'q kurs — yopiq. */
type Access = Record<string, string>;

/** Bugundan `months` oy keyingi sana (<input type="date"> uchun). */
const monthsFromToday = (months: number) => toDateInput(addMonths(new Date(), months));

export function EnrollmentEditor({ userId, courses, initial }: { userId: string; courses: CourseRow[]; initial: Access }) {
  const t = useTranslations("admin.students");
  const tc = useTranslations("common");
  const ts = useTranslations("sections");
  const tCourses = useTranslations("admin.courses");
  const [access, setAccess] = useState<Access>(initial);
  const [saved, setSaved] = useState(false);
  const { run, pending, error } = useAction(setEnrollmentsAction, { onSuccess: () => setSaved(true) });
  const today = toDateInput(new Date());
  const anyChecked = Object.keys(access).length > 0;

  const update = (fn: (a: Access) => Access) => { setSaved(false); setAccess(fn); };
  const toggle = (id: string) => update((a) => {
    const next = { ...a };
    if (id in next) delete next[id];
    else next[id] = "";
    return next;
  });
  const applyAll = (date: string) => update((a) => Object.fromEntries(Object.keys(a).map((id) => [id, date])));

  if (courses.length === 0) return <p className="text-sm text-muted">{t("noCoursesYet")}</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("coursesHint")}</p>
      {error && <Alert>{error}</Alert>}
      {saved && !error && <Alert kind="success">{tc("saved")}</Alert>}

      <ul className="divide-y divide-line rounded-xl border border-line">
        {courses.map((c) => {
          const on = c.id in access;
          const date = access[c.id] ?? "";
          const expired = on && date !== "" && date < today;
          return (
            <li key={c.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="mt-1 size-5 shrink-0 accent-(--brand)" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="truncate">{c.title}</span>
                    <SectionBadge section={c.section}>{ts(c.section as "LISTENING")}</SectionBadge>
                    {c.status === "DRAFT" && <Badge>{tCourses("draft")}</Badge>}
                    {expired && <Badge tone="danger">{t("expired")}</Badge>}
                  </span>
                  {on && c.total > 0 && (
                    <span className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                      <ProgressBar percent={c.percent} className="h-1.5 w-28" />
                      {c.percent}% · {t("progress", { done: c.completed, total: c.total })}
                    </span>
                  )}
                </span>
              </label>
              {on && (
                <label className="flex items-center gap-2 pl-8 text-sm sm:pl-0">
                  <span className="text-muted sm:sr-only">{t("expires")}</span>
                  <input
                    type="date" value={date} aria-label={t("expires")}
                    onChange={(e) => update((a) => ({ ...a, [c.id]: e.target.value }))}
                    className="h-10 rounded-lg border border-line bg-surface px-2 text-sm"
                  />
                  {date === "" && <span className="text-xs font-medium text-muted">{tc("unlimited")}</span>}
                </label>
              )}
            </li>
          );
        })}
      </ul>

      {anyChecked && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">{t("applyToChecked")}</span>
          {[1, 3, 6].map((m) => (
            <Button key={m} type="button" variant="outline" size="sm" onClick={() => applyAll(monthsFromToday(m))}>{t("months", { count: m })}</Button>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => applyAll(monthsFromToday(12))}>{t("year")}</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyAll("")}>{tc("unlimited")}</Button>
        </div>
      )}

      <Button
        type="button" disabled={pending}
        onClick={() => run({ userId, items: Object.entries(access).map(([courseId, d]) => ({ courseId, expiresAt: d || null })) })}
      >
        {pending ? tc("saving") : tc("save")}
      </Button>
    </div>
  );
}

type SessionRow = { id: string; userAgent: string | null; ip: string | null; lastSeenAt: string };

export function SessionList({ userId, sessions, max }: { userId: string; sessions: SessionRow[]; max: number }) {
  const t = useTranslations("admin.students");
  const { run, pending, error } = useAction(revokeSessionAction);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t("sessionsHint", { max })}</p>
      {error && <Alert>{error}</Alert>}
      {sessions.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{t("noSessions")}</p>
      ) : (
        <>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                <MonitorSmartphone className="size-5 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{describeDevice(s.userAgent)}</p>
                  <p className="truncate text-xs text-muted">{s.ip} · {t("lastSeen", { date: timeAgo(s.lastSeenAt) })}</p>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run({ userId, sessionId: s.id })}>
                  {t("revoke")}
                </Button>
              </li>
            ))}
          </ul>
          {sessions.length > 1 && (
            <Button type="button" variant="ghost" size="sm" className="text-danger" disabled={pending} onClick={() => run({ userId })}>
              {t("revokeAll")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
