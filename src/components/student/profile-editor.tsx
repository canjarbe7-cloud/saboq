"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useAction } from "@/hooks/use-action";
import { GENDERS, REGIONS } from "@/lib/validation";
import { updateProfileAction } from "@/server/actions/student";
import { cn } from "@/lib/cn";

type Personal = { birthDate: string; gender: string; region: string };

/** Bosiladigan katta qator (mohirdev uslubida): sarlavha, izoh, qiymat va o'ng tomonda strelka. */
function RowButton({ onClick, children, className }: { onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 text-left shadow-card transition-colors hover:border-brand/40 hover:bg-surface-2",
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronRight className="size-5 shrink-0 text-muted" />
    </button>
  );
}

function FormActions({ pending, onCancel, extra }: { pending: boolean; onCancel: () => void; extra?: ReactNode }) {
  const tc = useTranslations("common");
  return (
    <div className="flex items-center gap-2 pt-1">
      {extra}
      <Button type="button" variant="ghost" className="ml-auto" onClick={onCancel}>{tc("cancel")}</Button>
      <Button type="submit" disabled={pending}>{pending ? tc("saving") : tc("save")}</Button>
    </div>
  );
}

/** Profil sarlavhasi: avatar, ism va "yosh · jins · hudud" belgilari. Bosilsa tahrirlash oynasi ochiladi. */
export function PersonalInfoCard({ name, username, initial, badges }: {
  name: string; username: string; initial: Personal; badges: string[];
}) {
  const t = useTranslations("student.profile");
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initial);
  const { run, pending, error, clearError } = useAction(updateProfileAction, { onSuccess: () => setOpen(false) });
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

  return (
    <>
      <RowButton onClick={() => { setValues(initial); clearError(); setOpen(true); }}>
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-soft text-xl font-extrabold text-brand">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{name}</p>
            <p className="truncate text-sm text-muted">@{username}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {badges.length ? badges.map((b) => (
                <span key={b} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wide">{b}</span>
              )) : <span className="text-sm text-brand">{t("fillPersonal")}</span>}
            </div>
          </div>
        </div>
      </RowButton>

      <Modal open={open} onClose={() => setOpen(false)} title={t("editPersonal")}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(values); }}>
          <Field label={t("birthDate")} type="date" value={values.birthDate} min="1940-01-01"
            max={`${new Date().getFullYear() - 5}-12-31`} onChange={(e) => setValues({ ...values, birthDate: e.target.value })} />
          <div className="space-y-1.5">
            <span className="block text-sm font-medium">{t("gender")}</span>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g} type="button" aria-pressed={values.gender === g}
                  onClick={() => setValues({ ...values, gender: values.gender === g ? "" : g })}
                  className={cn(
                    "h-12 rounded-xl border text-sm font-semibold transition-colors",
                    values.gender === g ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-surface-2",
                  )}
                >
                  {t(g)}
                </button>
              ))}
            </div>
          </div>
          <Select label={t("region")} value={values.region} onChange={(e) => setValues({ ...values, region: e.target.value })}>
            <option value="">{t("choose")}</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          {error && <Alert>{error}</Alert>}
          <FormActions pending={pending} onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </>
  );
}

/** Elektron pochta yoki Telegram qatori + tahrirlash oynasi. */
export function ContactRow({ field, value }: { field: "email" | "telegram"; value: string | null }) {
  const t = useTranslations("student.profile");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value ?? "");
  const { run, pending, error, clearError } = useAction(updateProfileAction, { onSuccess: () => setOpen(false) });
  const shown = value && (field === "telegram" ? `@${value}` : value);

  return (
    <>
      <RowButton onClick={() => { setInput(shown || ""); clearError(); setOpen(true); }}>
        <p className="font-bold">{t(field)}</p>
        <p className="mt-0.5 text-xs text-muted">{t(`${field}Hint`)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {shown && <span className="truncate text-base">{shown}</span>}
          <span className={cn(
            "rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide",
            value ? "bg-success-soft text-success" : "bg-surface-2 text-muted",
          )}>
            {value ? t("added") : t("notAdded")}
          </span>
        </div>
      </RowButton>

      <Modal open={open} onClose={() => setOpen(false)} title={field === "email" ? t("editEmail") : t("editTelegram")}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run({ [field]: input }); }}>
          <Field
            label={t(field)} value={input} autoFocus autoCapitalize="none" spellCheck={false} maxLength={120}
            type={field === "email" ? "email" : "text"} inputMode={field === "email" ? "email" : "text"}
            placeholder={field === "email" ? "ali@gmail.com" : "@ali_valiyev"}
            onChange={(e) => setInput(e.target.value)}
          />
          {error && <Alert>{error}</Alert>}
          <FormActions
            pending={pending} onCancel={() => setOpen(false)}
            extra={value ? (
              <Button type="button" variant="ghost" className="text-danger" disabled={pending} onClick={() => run({ [field]: "" })}>
                {t("remove")}
              </Button>
            ) : null}
          />
        </form>
      </Modal>
    </>
  );
}
