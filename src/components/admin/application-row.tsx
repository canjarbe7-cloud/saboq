"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Phone, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/modal";
import { useAction } from "@/hooks/use-action";
import { formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/validation";
import { deleteApplicationAction, updateApplicationAction } from "@/server/actions/admin";

type Status = "NEW" | "CONTACTED" | "CLOSED";
const TONES = { NEW: "accent", CONTACTED: "brand", CLOSED: "neutral" } as const;

export function ApplicationRow({ app }: { app: { id: string; name: string; phone: string; level: string; status: Status; note: string | null; createdAt: string } }) {
  const t = useTranslations("admin.applications");
  const tc = useTranslations("common");
  const [note, setNote] = useState(app.note ?? "");
  const update = useAction(updateApplicationAction);
  const del = useAction(deleteApplicationAction);
  const dirty = note !== (app.note ?? "");

  return (
    <li className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold">{app.name}</span>
            <Badge tone={TONES[app.status]}>{t(`status${app.status}`)}</Badge>
          </p>
          <p className="text-sm text-muted">
            {t("level")}: {t(`levels.${app.level}` as "levels.unknown")} · {formatDateTime(app.createdAt)}
          </p>
        </div>
        <a href={`tel:${app.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-soft px-4 text-sm font-bold text-brand hover:brightness-95">
          <Phone className="size-4" /> {formatPhone(app.phone)}
        </a>
      </div>
      {update.error && <Alert>{update.error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t("notePlaceholder")} aria-label={t("note")}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
        <div className="flex gap-2">
          <select
            value={app.status} disabled={update.pending} aria-label={tc("edit")}
            onChange={(e) => update.run({ id: app.id, status: e.target.value as Status, note })}
            className="h-10 flex-1 rounded-xl border border-line bg-surface px-3 text-sm font-semibold"
          >
            {(["NEW", "CONTACTED", "CLOSED"] as const).map((s) => <option key={s} value={s}>{t(`status${s}`)}</option>)}
          </select>
          {dirty && (
            <Button type="button" size="sm" className="h-10" disabled={update.pending} onClick={() => update.run({ id: app.id, status: app.status, note })}>
              {tc("save")}
            </Button>
          )}
          <ConfirmButton
            trigger={<Trash2 className="size-4" />} triggerVariant="ghost" className="size-10 px-0 text-danger"
            title={t("deleteTitle")} confirmLabel={tc("delete")}
            onConfirm={() => del.run({ id: app.id })} pending={del.pending} error={del.error}
          />
        </div>
      </div>
    </li>
  );
}
