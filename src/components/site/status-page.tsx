import type { ReactNode } from "react";
import { Logo, LogoOrnament } from "@/components/ui/logo";

/** 404 va 500 sahifalari uchun umumiy ko'rinish. */
export function StatusPage({ code, title, text, action }: { code: string; title: string; text: string; action: ReactNode }) {
  return (
    <main className="bg-sky relative flex min-h-dvh flex-1 flex-col overflow-hidden px-5 py-5 sm:px-8">
      <div className="bg-dots pointer-events-none absolute right-8 top-24 h-24 w-40 text-brand/30" aria-hidden />
      <LogoOrnament className="pointer-events-none absolute -left-24 bottom-0 size-80 text-brand opacity-10 [--mark-hole:transparent]" />
      <div className="relative">
        <Logo />
      </div>
      <div className="relative m-auto max-w-md py-16 text-center">
        <p className="font-display text-8xl font-black tracking-tighter text-brand sm:text-9xl">{code}</p>
        <h1 className="mt-4 text-balance text-2xl font-extrabold sm:text-3xl">
          <span className="highlight-box">{title}</span>
        </h1>
        <p className="mx-auto mt-4 text-pretty text-muted">{text}</p>
        <div className="mt-8 flex justify-center">{action}</div>
      </div>
    </main>
  );
}
