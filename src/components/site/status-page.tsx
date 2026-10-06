import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

/** 404 va 500 sahifalari uchun umumiy ko'rinish. */
export function StatusPage({ code, title, text, action }: { code: string; title: string; text: string; action: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden px-5 py-5 sm:px-8">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-3xl" aria-hidden />
      <div className="relative">
        <Logo />
      </div>
      <div className="relative m-auto max-w-md py-16 text-center">
        <p className="text-8xl font-extrabold tracking-tighter text-brand sm:text-9xl">
          {code}<span className="text-accent">.</span>
        </p>
        <h1 className="mt-4 text-balance text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 text-pretty text-muted">{text}</p>
        <div className="mt-8 flex justify-center">{action}</div>
      </div>
    </main>
  );
}
