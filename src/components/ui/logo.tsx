import Link from "next/link";
import { siteConfig } from "@/config/site.config";
import { cn } from "@/lib/cn";

/** 8 qirrali yulduz nuqtalari: `outer` — uchlar, `inner` — botiq joylar radiusi. */
function star(cx: number, cy: number, outer: number, inner: number, rotate = 0) {
  return Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((i * 22.5 + rotate - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

// Logotipdagi "S" harfi va uning ostidan chiqqan yoy (64×64 katak ichida)
const S_PATH =
  "M44 8.6C40.6 5.6 36.2 4 31.2 4 21.6 4 14.6 9.600 14.6 17c0 4.600 2.200 7.800 5.600 10.400 4.600 3.500 14 10.600 19.400 18 2.400 3.300 3 5.600 2.400 8-.9 3.600-5.400 6.200-12.600 6.600 9 1 16.400-1.600 19-8.200 2.400-6-.2-11.400-5.800-17.200-5.600-5.800-14.800-9.600-18.600-13.800-2.400-2.600-2.200-7 .6-10.200 3.600-4.200 11.600-4.600 16.800.2Z";
const SWOOSH_PATH =
  "M15.4 27.6c1.600 5.400 6.400 9.400 12.400 12.600 4.600 2.400 8.600 4.400 10.400 7.400-1.400-3.400-6.200-4.600-10.600-5.400-5.800-2.400-10.400-7.600-12.200-14.600Z";

/** Naqsh (medalyon): markazi (cx, cy), radiusi r. Ichki "teshik" rangi `--mark-hole`dan olinadi. */
function Medallion({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const h = r * 0.62;
  const b = r * 0.2;
  const hole = "var(--mark-hole, var(--surface))";
  return (
    <>
      <g transform={`rotate(45 ${cx} ${cy})`}>
        <rect x={cx - h} y={cy - h} width={2 * h} height={2 * h} rx={r * 0.08} />
        {[[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => (
          <circle key={`c${dx}${dy}`} cx={cx + dx * h} cy={cy + dy * h} r={b} />
        ))}
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dy]) => (
          <rect key={`r${dx}${dy}`} x={cx + dx * h - b} y={cy + dy * h - b} width={2 * b} height={2 * b} rx={b * 0.3} />
        ))}
      </g>
      <polygon points={star(cx, cy, r * 0.56, r * 0.3)} fill={hole} />
      <polygon points={star(cx, cy, r * 0.27, r * 0.195, 22.5)} />
      <circle cx={cx} cy={cy} r={r * 0.07} fill={hole} />
    </>
  );
}

/**
 * Saboq belgisi — "S" harfi va to'q sariq naqsh. Harf rangi `currentColor`dan,
 * naqsh rangi `--mark-accent`dan (sukut bo'yicha urg'u rangi) olinadi.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d={S_PATH} fill="currentColor" />
      <g fill="var(--mark-accent, var(--accent))">
        <path d={SWOOSH_PATH} />
        <Medallion cx={24.6} cy={48.6} r={10.6} />
      </g>
    </svg>
  );
}

/** Logotipdagi naqshning o'zi — fon bezagi va kichik belgilar uchun. Rangi `currentColor`dan olinadi. */
export function LogoOrnament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="currentColor" aria-hidden>
      <Medallion cx={32} cy={32} r={28} />
    </svg>
  );
}

/** `inverse` — to'q fon ustida: harf va yozuv oq rangda (fon rangini konteynerda `--mark-hole` bilan bering). */
export function Logo({ href = "/", className, inverse }: { href?: string; className?: string; inverse?: boolean }) {
  return (
    <Link href={href} aria-label={siteConfig.fullName} className={cn("inline-flex items-center gap-2", className)}>
      <span className={inverse ? "text-white [--mark-accent:var(--on-brand)]" : "text-fg"}>
        <LogoMark className="size-10" />
      </span>
      <span className="flex flex-col leading-none" aria-hidden>
        <span className={cn("font-display text-[1.3rem] font-extrabold uppercase tracking-[0.14em]", inverse ? "text-white" : "text-fg")}>
          {siteConfig.name}
        </span>
        <span className={cn("mt-1 text-[0.6rem] font-bold uppercase tracking-[0.34em]", inverse ? "text-on-brand" : "text-accent")}>{siteConfig.tagline}</span>
      </span>
    </Link>
  );
}
