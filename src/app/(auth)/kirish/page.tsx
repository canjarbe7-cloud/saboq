import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Phone, Send } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { siteConfig } from "@/config/site.config";
import { getCurrentSession, homeFor } from "@/server/auth/guards";
import { safeRedirect } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Kirish", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/kirish">) {
  const raw = (await searchParams).next;
  const next = typeof raw === "string" ? raw : undefined;
  const active = await getCurrentSession();
  if (active) {
    if (active.user.mustChangePassword) redirect("/parol-yangilash");
    const home = homeFor(active.user.role);
    redirect(safeRedirect(next, home) ?? home);
  }

  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">{t("loginTitle")}</h1>
      <p className="mt-2 text-muted">{t("loginSubtitle")}</p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>

      {/* Ro'yxatdan o'tish yo'q — login va parolni faqat markaz beradi */}
      <div className="mt-8 rounded-2xl border border-line bg-surface p-4 text-sm">
        <p className="font-semibold">{t("noAccount")}</p>
        <p className="mt-0.5 text-muted">{t("contactCenter")}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-medium text-brand">
          <a href={siteConfig.phoneHref} className="inline-flex items-center gap-1.5 hover:underline">
            <Phone className="size-4" /> {siteConfig.phone}
          </a>
          <a href={siteConfig.telegramHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
            <Send className="size-4" /> {siteConfig.telegram}
          </a>
        </div>
      </div>
    </>
  );
}
