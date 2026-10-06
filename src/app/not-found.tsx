import { getTranslations } from "next-intl/server";
import { StatusPage } from "@/components/site/status-page";
import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("site.notFound");
  return <StatusPage code="404" title={t("title")} text={t("text")} action={<ButtonLink href="/" size="lg">{t("home")}</ButtonLink>} />;
}
