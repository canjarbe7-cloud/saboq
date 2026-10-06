"use client";

import { useActionState, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Lock, PartyPopper, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { LEVELS } from "@/lib/validation";
import { submitApplicationAction } from "@/server/actions/public";

export function ApplicationForm() {
  // "Yana ariza yuborish" bosilganda forma toza holatda qayta yaratiladi
  const [round, setRound] = useState(0);
  return <ApplicationFormInner key={round} onAnother={() => setRound((r) => r + 1)} />;
}

function ApplicationFormInner({ onAnother }: { onAnother: () => void }) {
  const t = useTranslations("site.contact");
  const [state, action, pending] = useActionState(submitApplicationAction, null);

  if (state?.ok) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} role="status" className="py-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-success-soft text-success"><PartyPopper className="size-8" /></span>
        <h3 className="mt-4 text-xl font-extrabold">{t("successTitle")}</h3>
        <p className="mx-auto mt-2 max-w-sm text-muted">{t("successText", { name: state.name })}</p>
        <Button type="button" variant="outline" className="mt-6" onClick={onAnother}>{t("another")}</Button>
      </motion.div>
    );
  }

  const values = state?.values;
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label={t("name")} name="name" required maxLength={80} autoComplete="name" defaultValue={values?.name} error={state?.fieldErrors?.name} />
      <Field
        label={t("phoneField")} name="phone" type="tel" inputMode="tel" required maxLength={20} autoComplete="tel"
        placeholder="+998 90 123 45 67" defaultValue={values?.phone} error={state?.fieldErrors?.phone}
      />
      <Select label={t("level")} name="level" defaultValue={values?.level ?? "unknown"}>
        {LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
      </Select>
      {/* Botlar uchun tuzoq: odamlarga ko'rinmaydi */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Button type="submit" size="lg" variant="accent" className="h-13 w-full text-base" disabled={pending}>
        <Send className="size-5" /> {pending ? t("submitting") : t("submit")}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
        <Lock className="size-3.5" /> {t("privacy")}
      </p>
    </form>
  );
}
