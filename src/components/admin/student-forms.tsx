"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Copy, KeyRound, ShieldCheck, ShieldOff, Trash2, UserPlus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { useAction } from "@/hooks/use-action";
import { slugify } from "@/lib/validation";
import {
  createStudentAction, deleteStudentAction, resetStudentPasswordAction, setStudentBlockedAction, updateStudentAction,
} from "@/server/actions/admin";

type Group = { id: string; name: string };
type Values = { name: string; phone: string; username: string; groupId: string; note: string };
type Credentials = { username: string; tempPassword: string };

function StudentFields({ values, set, groups, autoUsername }: {
  values: Values; set: (v: Partial<Values>) => void; groups: Group[]; autoUsername?: boolean;
}) {
  const t = useTranslations("admin.students");
  const [touched, setTouched] = useState(!autoUsername);
  return (
    <>
      <Field
        label={t("name")} required maxLength={80} value={values.name} autoComplete="off"
        onChange={(e) => set({ name: e.target.value, ...(touched ? {} : { username: slugify(e.target.value, ".") }) })}
      />
      <Field label={t("phone")} required type="tel" inputMode="tel" placeholder="+998 90 123 45 67" value={values.phone}
        autoComplete="off" onChange={(e) => set({ phone: e.target.value })} />
      <Field label={t("username")} required maxLength={32} value={values.username} autoCapitalize="none" autoComplete="off" spellCheck={false}
        onChange={(e) => { setTouched(true); set({ username: e.target.value.toLowerCase() }); }} />
      <Select label={t("group")} value={values.groupId} onChange={(e) => set({ groupId: e.target.value })}>
        <option value="">{t("noGroup")}</option>
        {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </Select>
      <Textarea label={t("note")} maxLength={500} value={values.note} onChange={(e) => set({ note: e.target.value })} className="min-h-20" />
    </>
  );
}

/** Login va vaqtinchalik parol — faqat bir marta ko'rsatiladi. */
function CredentialsPanel({ creds, onDone }: { creds: Credentials; onDone: () => void }) {
  const t = useTranslations("admin.students");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const site = typeof window !== "undefined" ? `${window.location.origin}/kirish` : "";
  const copy = async () => {
    const text = `${t("site")}: ${site}\n${t("username")}: ${creds.username}\n${t("tempPassword")}: ${creds.tempPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("credentialsText")}</p>
      <dl className="space-y-2 rounded-xl bg-surface-2 p-4 font-mono text-sm">
        <div className="flex justify-between gap-4"><dt className="font-sans text-muted">{t("username")}</dt><dd className="select-all font-bold">{creds.username}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-sans text-muted">{t("tempPassword")}</dt><dd className="select-all font-bold">{creds.tempPassword}</dd></div>
      </dl>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? tc("copied") : t("copyCredentials")}
        </Button>
        <Button type="button" className="flex-1" onClick={onDone}>{t("done")}</Button>
      </div>
    </div>
  );
}

const EMPTY: Values = { name: "", phone: "", username: "", groupId: "", note: "" };

export function CreateStudentButton({ groups }: { groups: Group[] }) {
  const t = useTranslations("admin.students");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [created, setCreated] = useState<(Credentials & { id: string }) | null>(null);
  const { run, pending, error, clearError } = useAction(createStudentAction, { onSuccess: setCreated });

  const close = () => {
    setOpen(false);
    clearError();
    if (created) router.push(`/admin/oquvchilar/${created.id}`);
    setCreated(null);
    setValues(EMPTY);
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus className="size-5" /> {t("add")}
      </Button>
      <Modal open={open} onClose={close} title={created ? t("credentialsTitle") : t("createTitle")}>
        {created ? (
          <CredentialsPanel creds={created} onDone={close} />
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run({ ...values, groupId: values.groupId || null }); }}>
            {error && <Alert>{error}</Alert>}
            <StudentFields values={values} set={(v) => setValues((p) => ({ ...p, ...v }))} groups={groups} autoUsername />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={close}>{tc("cancel")}</Button>
              <Button type="submit" disabled={pending}>{pending ? tc("saving") : t("create")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export function EditStudentForm({ id, initial, groups }: { id: string; initial: Values; groups: Group[] }) {
  const tc = useTranslations("common");
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);
  const { run, pending, error } = useAction(updateStudentAction, { onSuccess: () => setSaved(true) });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setSaved(false); run({ id, ...values, groupId: values.groupId || null }); }}>
      {error && <Alert>{error}</Alert>}
      {saved && !error && <Alert kind="success">{tc("saved")}</Alert>}
      <StudentFields values={values} set={(v) => { setSaved(false); setValues((p) => ({ ...p, ...v })); }} groups={groups} />
      <Button type="submit" disabled={pending}>{pending ? tc("saving") : tc("save")}</Button>
    </form>
  );
}

export function StudentSecurityActions({ id, blocked }: { id: string; blocked: boolean }) {
  const t = useTranslations("admin.students");
  const tc = useTranslations("common");
  const router = useRouter();
  const [creds, setCreds] = useState<Credentials | null>(null);
  const block = useAction(setStudentBlockedAction);
  const reset = useAction(resetStudentPasswordAction, { onSuccess: setCreds });
  const del = useAction(deleteStudentAction, { onSuccess: () => router.push("/admin/oquvchilar"), refresh: false });

  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmButton
        trigger={<><KeyRound className="size-4" /> {t("resetPassword")}</>}
        title={t("resetTitle")} text={t("resetText")} confirmLabel={t("resetPassword")} variant="primary"
        onConfirm={() => reset.run({ id })} pending={reset.pending} error={reset.error}
      />
      {blocked ? (
        <Button type="button" variant="outline" size="sm" disabled={block.pending} onClick={() => block.run({ id, blocked: false })}>
          <ShieldCheck className="size-4" /> {t("unblock")}
        </Button>
      ) : (
        <ConfirmButton
          trigger={<><ShieldOff className="size-4" /> {t("block")}</>}
          title={t("blockTitle")} text={t("blockText")} confirmLabel={t("block")}
          onConfirm={() => block.run({ id, blocked: true })} pending={block.pending} error={block.error}
        />
      )}
      <ConfirmButton
        trigger={<><Trash2 className="size-4" /> {tc("delete")}</>}
        title={t("deleteTitle")} text={t("deleteText")} confirmLabel={tc("delete")}
        onConfirm={() => del.run({ id })} pending={del.pending} error={del.error}
        className="text-danger"
      />
      {block.error && <Alert>{block.error}</Alert>}
      <Modal open={!!creds} onClose={() => setCreds(null)} title={t("credentialsTitle")}>
        {creds && <CredentialsPanel creds={creds} onDone={() => setCreds(null)} />}
      </Modal>
    </div>
  );
}
