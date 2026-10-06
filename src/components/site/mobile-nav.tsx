"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronRight, LogIn, Menu, Phone, Send, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { siteConfig } from "@/config/site.config";

type NavLink = { href: string; label: string };

/**
 * Telefon va planshet uchun ochiladigan menyu. Sarlavha (header) ostida ochiladi;
 * havola bosilganda, Esc yoki fon bosilganda yopiladi.
 */
export function MobileNav({ links, labels }: {
  links: NavLink[];
  labels: { menu: string; close: string; login: string; apply: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [path, setPath] = useState(pathname);
  // Boshqa sahifaga o'tilganda menyu yopiladi
  if (path !== pathname) {
    setPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    // Menyu ochiq turganda orqadagi sahifa aylanmasin
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="site-mobile-nav"
        aria-label={open ? labels.close : labels.menu}
        className="grid size-10 place-items-center rounded-xl text-fg transition-colors hover:bg-surface-2 lg:hidden"
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>

      {/* Sarlavhada backdrop-blur bor — fixed element uning ichida to'g'ri joylashmaydi, shuning uchun body'ga chiqariladi */}
      {open &&
        createPortal(
          <div id="site-mobile-nav" className="fixed inset-x-0 bottom-0 top-16 z-40 lg:hidden">
            <button type="button" aria-label={labels.close} onClick={close} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <nav className="relative max-h-full animate-[menu-in_0.18s_ease-out] overflow-y-auto border-b border-line bg-surface px-4 pb-6 pt-2 shadow-2xl">
              <ul className="divide-y divide-line">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={close} className="flex items-center justify-between py-3.5 text-base font-semibold">
                      {l.label}
                      <ChevronRight className="size-5 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link href="/kirish" onClick={close} className={buttonClass({ variant: "outline", size: "lg" })}>
                  <LogIn className="size-5 text-brand" /> {labels.login}
                </Link>
                <Link href="/aloqa#ariza" onClick={close} className={buttonClass({ variant: "accent", size: "lg" })}>
                  {labels.apply} <ArrowRight className="size-5" />
                </Link>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3">
                <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                  <a href={siteConfig.phoneHref} className="inline-flex items-center gap-1.5 hover:text-brand"><Phone className="size-4 text-brand" />{siteConfig.phone}</a>
                  <a href={siteConfig.telegramHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand">
                    <Send className="size-4 text-brand" />{siteConfig.telegram}
                  </a>
                </div>
                <ThemeToggle />
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
