import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo, LogoOrnament } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/** Login va parol yangilash sahifalari uchun umumiy qolip. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("auth");
  const points = t.raw("brandPoints") as string[];

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-brand p-12 text-brand-fg [--mark-hole:var(--brand)] lg:flex lg:flex-col lg:justify-between">
        <LogoOrnament className="absolute -right-32 -top-32 size-[30rem] animate-spin-slow text-on-brand opacity-25" />
        <div className="bg-dots absolute bottom-12 right-12 h-28 w-44 text-white/25" aria-hidden />
        <div className="absolute -bottom-40 -left-24 size-96 rounded-full bg-brand-deep/60 blur-3xl" aria-hidden />
        <Logo inverse className="relative" />
        <div className="relative space-y-7">
          <h2 className="max-w-md text-balance text-4xl font-extrabold leading-[1.15] xl:text-5xl">{t("brandTagline")}</h2>
          <ul className="space-y-3 font-semibold text-white/90">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-brand">
                  <Check className="size-4" strokeWidth={3.5} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm font-semibold text-white/70">Ingliz tili · IELTS · Listening · Reading · Writing · Speaking</p>
      </aside>

      <main className="relative flex flex-col overflow-hidden bg-surface px-5 py-6 sm:px-10">
        {/* Telefonda yon panel yo'q — o'rniga osmon foni va nuqtali naqsh */}
        <div className="bg-sky pointer-events-none absolute inset-x-0 top-0 h-64 lg:hidden" aria-hidden />
        <div className="bg-dots pointer-events-none absolute right-5 top-24 h-16 w-28 text-brand/30 lg:hidden" aria-hidden />
        <div className="relative flex items-center justify-between">
          <Logo className="lg:invisible" />
          <ThemeToggle />
        </div>
        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="relative text-center text-xs font-semibold text-muted lg:hidden">Ingliz tili · IELTS</p>
      </main>
    </div>
  );
}
