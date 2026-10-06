"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, PasswordField } from "@/components/ui/field";

/** `next` — kirgandan keyin qaytiladigan sahifa (server qayta tekshiradi). */
export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Alert>{state.error}</Alert>}
      <Field
        label={t("username")}
        name="username"
        defaultValue={state?.values?.username}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        maxLength={64}
      />
      <PasswordField label={t("password")} name="password" autoComplete="current-password" required maxLength={128} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <LogIn className="size-5" />
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
