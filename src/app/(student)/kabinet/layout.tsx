import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { StudentShell } from "@/components/student/student-shell";
import { requireStudent } from "@/server/auth/guards";

export const metadata: Metadata = { title: { default: "Kabinet", template: "%s · Saboq" }, robots: { index: false } };

export default async function StudentLayout({ children }: LayoutProps<"/kabinet">) {
  const { user } = await requireStudent();
  const { common, errors, sections, auth, student } = await getMessages();
  return (
    <NextIntlClientProvider messages={{ common, errors, sections, auth, student }}>
      <StudentShell userName={user.name}>{children}</StudentShell>
    </NextIntlClientProvider>
  );
}
