"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, History, Inbox, LayoutDashboard, LayoutTemplate, LogOut, Menu, QrCode, UserCog, Users, UsersRound, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logoutAction } from "@/server/actions/auth";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/oquvchilar", key: "students", icon: Users },
  { href: "/admin/guruhlar", key: "groups", icon: UsersRound },
  { href: "/admin/davomat", key: "attendance", icon: QrCode },
  { href: "/admin/kurslar", key: "courses", icon: BookOpen, also: "/admin/darslar" },
  { href: "/admin/arizalar", key: "applications", icon: Inbox },
  { href: "/admin/kontent", key: "content", icon: LayoutTemplate },
  { href: "/admin/jurnal", key: "audit", icon: History },
  { href: "/admin/profil", key: "profile", icon: UserCog },
] as const;

/** Telefondagi pastki panelda turadigan bo'limlar (qolganlari "Menyu" ichida). */
const TAB_KEYS: readonly string[] = ["dashboard", "students", "courses", "applications"];

export function AdminShell({ children, userName, newApplications }: { children: ReactNode; userName: string; newApplications: number }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (item: (typeof NAV)[number]) =>
    "exact" in item ? pathname === item.href : pathname.startsWith(item.href) || ("also" in item && pathname.startsWith(item.also));
  // "Menyu" tugmasi pastki panelda yo'q bo'limlardan biri ochiq bo'lganda faol ko'rinadi
  const moreActive = NAV.some((item) => !TAB_KEYS.includes(item.key) && isActive(item));

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-bold transition-colors",
              active ? "bg-brand text-brand-fg shadow-md shadow-brand/25" : "text-muted hover:bg-brand-soft hover:text-brand",
            )}
          >
            <item.icon className="size-5 shrink-0" />
            <span className="flex-1">{t(`admin.nav.${item.key}`)}</span>
            {item.key === "applications" && newApplications > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-fg">{newApplications}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-2 border-t border-line pt-4">
      <p className="truncate px-4 text-sm font-bold">{userName}</p>
      <form action={logoutAction}>
        <button type="submit" className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-bold text-muted hover:bg-danger-soft hover:text-danger">
          <LogOut className="size-5" /> {t("common.logout")}
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Kompyuter: doimiy yon panel */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface p-4 lg:flex">
        <div className="flex items-center justify-between">
          <Logo href="/admin" />
          <ThemeToggle />
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {footer}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Telefon: yuqori panel + ochiladigan menyu */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <Logo href="/admin" />
          <ThemeToggle />
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" aria-label={t("common.close")} className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col gap-6 bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wide text-muted">{t("admin.nav.panel")}</span>
                <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="grid size-10 place-items-center rounded-xl hover:bg-surface-2">
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{nav}</div>
              {footer}
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

        {/* Telefon: pastki navigatsiya — asosiy bo'limlar, qolganlari "Menyu" ichida */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {NAV.filter((item) => TAB_KEYS.includes(item.key)).map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={cn("flex min-w-0 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", active ? "text-brand" : "text-muted")}
              >
                <span className={cn("relative grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-brand text-brand-fg")}>
                  <item.icon className="size-5" />
                  {item.key === "applications" && newApplications > 0 && (
                    <span className="absolute -top-1 right-0 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-accent-fg">{newApplications}</span>
                  )}
                </span>
                <span className="max-w-full truncate px-0.5">{t(`admin.nav.${item.key}`)}</span>
              </Link>
            );
          })}
          <button
            type="button" onClick={() => setOpen(true)} aria-expanded={open}
            className={cn("flex min-w-0 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", moreActive ? "text-brand" : "text-muted")}
          >
            <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", moreActive && "bg-brand text-brand-fg")}>
              <Menu className="size-5" />
            </span>
            {t("admin.nav.menu")}
          </button>
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({ title, action, back }: { title: string; action?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="-mt-2 inline-flex items-center gap-1 py-2 text-sm font-medium text-muted hover:text-fg">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {action}
      </div>
    </div>
  );
}

