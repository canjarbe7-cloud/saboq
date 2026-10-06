"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, History, Inbox, LayoutDashboard, LogOut, Menu, UserCog, Users, UsersRound, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logoutAction } from "@/server/actions/auth";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/oquvchilar", key: "students", icon: Users },
  { href: "/admin/guruhlar", key: "groups", icon: UsersRound },
  { href: "/admin/kurslar", key: "courses", icon: BookOpen, also: "/admin/darslar" },
  { href: "/admin/arizalar", key: "applications", icon: Inbox },
  { href: "/admin/jurnal", key: "audit", icon: History },
  { href: "/admin/profil", key: "profile", icon: UserCog },
] as const;

export function AdminShell({ children, userName, newApplications }: { children: ReactNode; userName: string; newApplications: number }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = "exact" in item
          ? pathname === item.href
          : pathname.startsWith(item.href) || ("also" in item && pathname.startsWith(item.also));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-brand text-brand-fg shadow-sm" : "text-muted hover:bg-surface-2 hover:text-fg",
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
      <p className="truncate px-3 text-sm font-semibold">{userName}</p>
      <form action={logoutAction}>
        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-danger-soft hover:text-danger">
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
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t("admin.nav.menu")}
              className="relative grid size-10 place-items-center rounded-xl text-fg hover:bg-surface-2"
            >
              <Menu className="size-6" />
              {newApplications > 0 && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-accent ring-2 ring-surface" />}
            </button>
          </div>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" aria-label={t("common.close")} className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col gap-6 bg-surface p-4 shadow-2xl">
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

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, action, back }: { title: string; action?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-fg">
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

