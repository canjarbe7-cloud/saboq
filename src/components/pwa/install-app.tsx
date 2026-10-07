"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { promptInstall, useInstallState } from "@/lib/install-prompt";
import { cn } from "@/lib/cn";

/**
 * "Ilovani o'rnatish" tugmasi (/ilova sahifasi uchun). Brauzer o'rnatish oynasini ko'rsata olsa — shuni ochadi;
 * bo'lmasa (iPhone va b.) pastdagi qo'lda o'rnatish ko'rsatmasiga ishora qiladi.
 */
export function InstallButton({ className }: { className?: string }) {
  const t = useTranslations("common.install");
  const state = useInstallState();

  if (state === "installed") {
    return (
      <p className={cn("inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 font-bold", className)}>
        <CheckCircle2 className="size-5" /> {t("installed")}
      </p>
    );
  }
  if (state === "prompt") {
    return (
      <Button type="button" size="lg" onClick={() => void promptInstall()} className={cn("h-14 bg-white px-9 text-base text-brand shadow-lg shadow-black/15 hover:bg-white/90", className)}>
        <Download className="size-5" /> {t("button")}
      </Button>
    );
  }
  // Brauzer o'zi oyna ko'rsata olmaydi — qaysi ko'rsatma tegishli ekanini aytamiz
  return (
    <p className={cn("inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-left text-sm font-bold", className)}>
      {state === "ios" ? <Share className="size-5 shrink-0" /> : <Download className="size-5 shrink-0" />}
      {state === "ios" ? t("hintIos") : state === "manual" ? t("hintManual") : t("checking")}
    </p>
  );
}

const DISMISS_KEY = "install-banner-dismissed";
const subscribeNoop = () => () => {};
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

/** Kabinetdagi eslatma: "Saboq'ni ilova qilib o'rnating". O'rnatilgan bo'lsa yoki yopilgan bo'lsa ko'rinmaydi. */
export function InstallBanner() {
  const t = useTranslations("common.install");
  const state = useInstallState();
  const stored = useSyncExternalStore(subscribeNoop, readDismissed, () => true);
  const [closed, setClosed] = useState(false);

  if (!state || state === "installed" || stored || closed) return null;

  const dismiss = () => {
    setClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };
  const cta = "inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-brand px-4 text-sm font-bold text-brand-fg shadow-md shadow-brand/25 transition hover:bg-brand-hover active:scale-[0.98]";

  return (
    <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-3 pr-2 shadow-card sm:p-4 sm:pr-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#fdf3ea] text-[#081d38] [--mark-accent:#f76c19] [--mark-hole:#fdf3ea]"><LogoMark className="size-8" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold leading-tight">{t("bannerTitle")}</p>
        <p className="mt-0.5 text-sm leading-snug text-muted">{t("bannerText")}</p>
      </div>
      {state === "prompt" ? (
        <button type="button" onClick={() => void promptInstall()} className={cta}><Download className="size-4" /> {t("short")}</button>
      ) : (
        <Link href="/ilova" className={cta}><SquarePlus className="size-4" /> {t("how")}</Link>
      )}
      <button type="button" onClick={dismiss} aria-label={t("dismiss")} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
        <X className="size-4" />
      </button>
    </div>
  );
}
