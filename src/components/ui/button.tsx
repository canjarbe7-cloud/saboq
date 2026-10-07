import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 select-none";

const variants = {
  primary: "bg-brand text-brand-fg hover:bg-brand-hover shadow-md shadow-brand/25",
  accent: "bg-accent text-accent-fg hover:brightness-95 shadow-sm",
  outline: "border border-line bg-surface text-fg hover:border-brand/50 hover:text-brand",
  ghost: "text-fg hover:bg-brand-soft hover:text-brand",
  danger: "bg-danger text-white hover:brightness-95",
} as const;

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-12 px-7 text-base",
} as const;

type Style = { variant?: keyof typeof variants; size?: keyof typeof sizes };

export const buttonClass = ({ variant = "primary", size = "md" }: Style = {}, className?: string) =>
  cn(base, variants[variant], sizes[size], className);

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & Style) {
  return <button className={buttonClass({ variant, size }, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & Style) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}
