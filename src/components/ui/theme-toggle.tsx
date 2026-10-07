"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

/** Yorug'/qorong'i rejimni almashtiradi va tanlovni brauzerda eslab qoladi. */
export function ThemeToggle() {
  const t = useTranslations("common");
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("themeToggle")}
      className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-brand-soft hover:text-brand"
    >
      <Sun className="hidden size-5 dark:block" />
      <Moon className="size-5 dark:hidden" />
    </button>
  );
}
