"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RotateCw } from "lucide-react";
import { StatusPage } from "@/components/site/status-page";
import { Button } from "@/components/ui/button";

/** Sahifa ichida kutilmagan xato bo'lganda ko'rsatiladi (500). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("site.error");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusPage
      code="500"
      title={t("title")}
      text={t("text")}
      action={<Button size="lg" onClick={reset}><RotateCw className="size-5" /> {t("retry")}</Button>}
    />
  );
}
