import { BookOpenText, Headphones, Languages, Mic, PenLine, SpellCheck, type LucideIcon } from "lucide-react";
import type { SECTIONS } from "@/lib/validation";

export type Section = (typeof SECTIONS)[number];

/**
 * IELTS bo'limlarining ikonkasi va rangi — sayt, kabinet va admin panelda bir xil ko'rinadi.
 * Rang faqat ikonka va belgida ishlatiladi; matnlar umumiy palitrada qoladi.
 */
export const SECTION_STYLE: Record<Section, { icon: LucideIcon; tone: string }> = {
  LISTENING: { icon: Headphones, tone: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300" },
  READING: { icon: BookOpenText, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" },
  WRITING: { icon: PenLine, tone: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300" },
  SPEAKING: { icon: Mic, tone: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" },
  GRAMMAR: { icon: SpellCheck, tone: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300" },
  VOCABULARY: { icon: Languages, tone: "bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300" },
};

export const sectionStyle = (section: string) => SECTION_STYLE[section as Section] ?? SECTION_STYLE.LISTENING;
