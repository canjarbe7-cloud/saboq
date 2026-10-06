import type { ReactNode } from "react";
import { sectionStyle } from "@/lib/sections";
import { cn } from "@/lib/cn";

/** IELTS bo'limi ikonkasi (Listening, Reading …) o'z rangida. */
export function SectionIcon({ section, className, iconClassName }: { section: string; className?: string; iconClassName?: string }) {
  const { icon: Icon, tone } = sectionStyle(section);
  return (
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tone, className)} aria-hidden>
      <Icon className={cn("size-5", iconClassName)} />
    </span>
  );
}

/** Bo'lim nomi yozilgan kichik belgi (badge) — bo'lim rangida. */
export function SectionBadge({ section, children, className, icon = true }: {
  section: string; children: ReactNode; className?: string; icon?: boolean;
}) {
  const { icon: Icon, tone } = sectionStyle(section);
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tone, className)}>
      {icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}
