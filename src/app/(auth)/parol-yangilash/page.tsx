import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { logoutAction } from "@/server/actions/auth";
import { homeFor, requireUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Yangi parol", robots: { index: false } };

/** Birinchi kirishda vaqtinchalik parolni majburiy almashtirish. */
export default async function ForcedPasswordPage() {
  const { user } = await requireUser({ allowMustChangePassword: true });
  if (!user.mustChangePassword) redirect(homeFor(user.role));

  const t = await getTranslations();
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">{t("auth.forcedTitle")}</h1>
      <p className="mt-2 text-muted">{t("auth.forcedSubtitle")}</p>
      <div className="mt-8">
        <ChangePasswordForm mode="forced" />
      </div>
      <form action={logoutAction} className="mt-6 text-center">
        <button type="submit" className="text-sm font-medium text-muted hover:text-fg hover:underline">
          {t("common.logout")}
        </button>
      </form>
    </>
  );
}
