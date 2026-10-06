import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Element ekranga kirganda yengil "ko'tarilib" paydo bo'ladi — sof CSS (globals.css → .reveal).
 * JavaScript kerak emas: kontent doim ko'rinadi, "harakatni kamaytirish" yoqilgan qurilmalarda
 * va animatsiyani qo'llamaydigan brauzerlarda esa animatsiyasiz chiqadi.
 * `delay` — qatordagi elementlar ketma-ket chiqishi uchun (0, 1, 2 …).
 */
export function FadeIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div className={cn("reveal", className)} style={delay ? ({ "--reveal-step": delay } as CSSProperties) : undefined}>
      {children}
    </div>
  );
}
