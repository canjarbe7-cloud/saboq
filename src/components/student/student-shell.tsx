"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, LogOut, QrCode, User } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logoutAction } from "@/server/actions/auth";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/kabinet", key: "courses", icon: BookOpen },
  { href: "/kabinet/davomat", key: "attendance", icon: QrCode },
  { href: "/kabinet/profil", key: "profile", icon: User },
] as const;

export function StudentShell({ children, userName }: { children: ReactNode; userName: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/kabinet" ? !NAV.some((n) => n.href !== "/kabinet" && pathname.startsWith(n.href)) : pathname.startsWith(href));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href="/kabinet" />
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-bold transition-colors",
                  isActive(item.href) ? "bg-brand text-brand-fg shadow-md shadow-brand/25" : "text-muted hover:bg-brand-soft hover:text-brand",
                )}
              >
                {t(`student.nav.${item.key}`)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <span className="mr-1 hidden max-w-40 truncate text-sm font-semibold md:block">{userName}</span>
            <ThemeToggle />
            <form action={logoutAction}>
              <button type="submit" aria-label={t("common.logout")} title={t("common.logout")}
                className="grid size-10 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
                <LogOut className="size-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-10 sm:pt-8">{children}</main>

      {/* Telefon: pastki navigatsiya (bosh barmoq yetadigan joyda) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-xs font-bold", isActive(item.href) ? "text-brand" : "text-muted")}
          >
            <span className={cn("grid h-7 w-14 place-items-center rounded-full transition-colors", isActive(item.href) && "bg-brand text-brand-fg")}>
              <item.icon className="size-5" />
            </span>
            {t(`student.nav.${item.key}`)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
