import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";

export const metadata: Metadata = { title: { default: "Admin panel", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Layout tekshiruvi qulaylik uchun; har bir sahifa va amal o'zi ham requireAdmin() chaqiradi.
  const { user } = await requireAdmin();
  const newApplications = await db.application.count({ where: { status: "NEW" } });
  const { common, errors, sections, auth, admin } = await getMessages();
  return (
    <NextIntlClientProvider messages={{ common, errors, sections, auth, admin }}>
      <AdminShell userName={user.name} newApplications={newApplications}>
        {children}
      </AdminShell>
    </NextIntlClientProvider>
  );
}
