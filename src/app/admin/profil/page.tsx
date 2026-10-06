import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/admin-shell";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Card, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Profil" };

export default async function AdminProfilePage() {
  const { user } = await requireAdmin();
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t("admin.nav.profile")} />
      <Card className="max-w-md">
        <CardTitle>{t("auth.changePassword")}</CardTitle>
        <p className="-mt-2 mb-4 text-sm text-muted">@{user.username}</p>
        <ChangePasswordForm mode="profile" />
      </Card>
    </>
  );
}
