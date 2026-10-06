import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

/** Admin panel ichida topilmagan yozuv — yon panel joyida qoladi. */
export default async function AdminNotFound() {
  const t = await getTranslations("admin.notFound");
  return (
    <EmptyState
      icon={<SearchX className="size-7" />} title={t("title")} text={t("text")}
      action={<ButtonLink href="/admin">{t("back")}</ButtonLink>}
    />
  );
}
