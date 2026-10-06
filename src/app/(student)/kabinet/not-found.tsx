import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

/** Kabinet ichida topilmagan kurs yoki dars — menyu va sarlavha joyida qoladi. */
export default async function StudentNotFound() {
  const t = await getTranslations("student.notFound");
  return (
    <EmptyState
      icon={<SearchX className="size-7" />} title={t("title")} text={t("text")}
      action={<ButtonLink href="/kabinet">{t("back")}</ButtonLink>}
    />
  );
}
