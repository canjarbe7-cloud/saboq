import { getTranslations } from "next-intl/server";
import { Clock, Phone, Send } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { siteConfig } from "@/config/site.config";

/** Kirish muddati tugaganda ko'rsatiladigan xushmuomala xabar. */
export async function ExpiredNotice({ course }: { course: string }) {
  const t = await getTranslations("student.expired");
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-6 text-center shadow-card sm:p-10">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent-fg dark:text-accent">
        <Clock className="size-8" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("text", { course })}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <a href={siteConfig.phoneHref} className={buttonClass({ size: "lg" })}>
          <Phone className="size-5" /> {siteConfig.phone}
        </a>
        <a href={siteConfig.telegramHref} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "outline", size: "lg" })}>
          <Send className="size-5" /> {t("telegram")}
        </a>
      </div>
      <p className="mt-4 text-sm text-muted">{siteConfig.workingHours}</p>
    </div>
  );
}
