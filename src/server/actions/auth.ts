"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { attemptLogin, changePassword } from "@/server/auth/login";
import { clearSessionCookie, homeFor, requireUser, setSessionCookie } from "@/server/auth/guards";
import { destroySession } from "@/server/auth/session";
import { getRequestMeta } from "@/server/request";
import { PASSWORD_MAX } from "@/lib/password-policy";
import { safeRedirect } from "@/lib/safe-redirect";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  /** Xatodan keyin forma qayta to'ldirilishi uchun (parollar hech qachon qaytarilmaydi). */
  values?: Record<string, string>;
} | null;

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(PASSWORD_MAX),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth.errors");
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: t("required") };

  const result = await attemptLogin(parsed.data, await getRequestMeta());
  if (!result.ok) {
    const values = { username: parsed.data.username };
    switch (result.code) {
      case "INVALID":
        return { values, error: t("invalid", { count: result.attemptsLeft }) };
      case "LOCKED":
        return { values, error: t("locked", { minutes: result.retryAfterMin }) };
      case "RATE_LIMITED":
        return { values, error: t("rateLimited") };
      case "BLOCKED":
        return { values, error: t("blocked") };
    }
  }

  // Shu brauzerda eski sessiya qolgan bo'lsa, u tugatiladi (qurilma limitini band qilmasin)
  await destroySession((await cookies()).get(SESSION_COOKIE)?.value);
  await setSessionCookie(result.token);
  if (result.user.mustChangePassword) redirect("/parol-yangilash");
  const home = homeFor(result.user.role);
  // Login sahifasiga yopiq sahifadan kelgan bo'lsa — o'sha sahifaga qaytaramiz
  redirect(safeRedirect(formData.get("next"), home) ?? home);
}

export async function logoutAction() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await destroySession(token);
  await clearSessionCookie();
  redirect("/kirish");
}

const changeSchema = z
  .object({
    currentPassword: z.string().min(1).max(PASSWORD_MAX),
    newPassword: z.string().min(1).max(PASSWORD_MAX),
    confirmPassword: z.string().min(1).max(PASSWORD_MAX),
    // "forced" — birinchi kirishdagi majburiy o'zgartirish (tugagach kabinetga o'tadi)
    mode: z.enum(["forced", "profile"]).default("profile"),
  });

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, user } = await requireUser({ allowMustChangePassword: true });
  const t = await getTranslations("auth");

  const parsed = changeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t("errors.required") };
  const { currentPassword, newPassword, confirmPassword, mode } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { fieldErrors: { confirmPassword: t("errors.mismatch") } };
  }

  const result = await changePassword({
    userId: user.id,
    currentSessionId: session.id,
    currentPassword,
    newPassword,
  });

  if (!result.ok) {
    if (result.code === "WRONG_CURRENT") return { fieldErrors: { currentPassword: t("errors.wrongCurrent") } };
    if (result.code === "SAME_AS_OLD") return { fieldErrors: { newPassword: t("errors.sameAsOld") } };
    return { fieldErrors: { newPassword: t(`passwordRules.${result.issues[0]}`) } };
  }

  if (mode === "forced") redirect(homeFor(user.role));
  return { success: t("passwordChanged") };
}
