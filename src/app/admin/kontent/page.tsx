import type { Metadata } from "next";
import { ContentEditor } from "@/components/admin/content-editor";
import { requireAdmin } from "@/server/auth/guards";
import { getSiteContent } from "@/server/services/site-content";

export const metadata: Metadata = { title: "Sayt kontenti" };

/** Bosh sahifa kontenti va aloqa ma'lumotlarini tahrirlash. */
export default async function ContentPage() {
  await requireAdmin();
  return <ContentEditor initial={await getSiteContent()} />;
}
