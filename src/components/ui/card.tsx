import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-3xl border border-line bg-surface p-5 shadow-card", className)} {...props} />;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-extrabold">{children}</h2>
      {action}
    </div>
  );
}

const tones = {
  neutral: "bg-surface-2 text-muted",
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  accent: "bg-accent-soft text-accent-fg dark:text-accent",
} as const;

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold", tones[tone], className)}
      {...props}
    />
  );
}

/** Bo'sh holat: ro'yxatda hali hech narsa yo'q. */
export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-14 place-items-center rounded-full bg-brand text-brand-fg shadow-lg shadow-brand/30">{icon}</div>}
      <p className="text-base font-bold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Yuklanayotgan kontent o'rnidagi "skelet". */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-xl bg-[linear-gradient(90deg,var(--surface-2)_25%,var(--line)_50%,var(--surface-2)_75%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2.5 overflow-hidden rounded-full bg-brand-soft", className)}
    >
      <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
}
