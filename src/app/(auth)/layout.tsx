import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/** Login va parol yangilash sahifalari uchun umumiy qolip. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("auth");
  const points = t.raw("brandPoints") as string[];

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-brand p-12 text-brand-fg lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-accent/30 blur-3xl" aria-hidden />
        <Logo className="relative [&>span:first-child]:bg-white [&>span:first-child]:text-brand" />
        <div className="relative space-y-6">
          <h2 className="max-w-md text-4xl font-extrabold leading-tight">{t("brandTagline")}</h2>
          <ul className="space-y-3 text-white/90">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-accent text-accent-fg">
                  <Check className="size-4" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/70">IELTS 7.0+ · Listening · Reading · Writing · Speaking</p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
