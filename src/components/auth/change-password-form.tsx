"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { changePasswordAction } from "@/server/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/field";
import { PasswordStrength } from "./password-strength";

/**
 * mode="forced"  — birinchi kirishdagi majburiy o'zgartirish;
 * mode="profile" — profil sahifasidagi oddiy o'zgartirish.
 */
export function ChangePasswordForm({ mode }: { mode: "forced" | "profile" }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(changePasswordAction, null);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== newPassword;

  return (
    <form action={action} className="space-y-4" key={state?.success}>
      <input type="hidden" name="mode" value={mode} />
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.success && <Alert kind="success">{state.success}</Alert>}

      <PasswordField
        label={mode === "forced" ? t("currentPasswordTemp") : t("currentPassword")}
        name="currentPassword"
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.currentPassword}
      />
      <PasswordField
        label={t("newPassword")}
        name="newPassword"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={state?.fieldErrors?.newPassword}
        hint={<PasswordStrength password={newPassword} />}
      />
      <PasswordField
        label={t("confirmPassword")}
        name="confirmPassword"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={mismatch ? t("errors.mismatch") : state?.fieldErrors?.confirmPassword}
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending || mismatch}>
        {pending ? t("changing") : t("changePassword")}
      </Button>
    </form>
  );
}
