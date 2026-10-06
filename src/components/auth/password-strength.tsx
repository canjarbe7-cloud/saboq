"use client";

import { useTranslations } from "next-intl";
import { passwordStrength } from "@/lib/password-policy";
import { cn } from "@/lib/cn";

const COLORS = ["bg-danger", "bg-danger", "bg-accent", "bg-success", "bg-success"];

export function PasswordStrength({ password }: { password: string }) {
  const t = useTranslations("auth.strength");
  if (!password) return null;
  const score = passwordStrength(password);
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= Math.max(score, 1) ? COLORS[score] : "bg-line")}
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        {t("label")}: <span className="font-semibold text-fg">{t(String(score) as "0")}</span>
      </p>
    </div>
  );
}
