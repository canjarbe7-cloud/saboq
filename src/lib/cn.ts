import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind klasslarini shartli birlashtirish. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
