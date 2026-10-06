import Link from "next/link";
import { siteConfig } from "@/config/site.config";
import { cn } from "@/lib/cn";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-extrabold tracking-tight", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-lg text-brand-fg shadow-sm">
        S<span className="sr-only">ABOQ</span>
      </span>
      <span className="text-xl" aria-hidden>
        {siteConfig.name}
        <span className="text-accent">.</span>
      </span>
    </Link>
  );
}
