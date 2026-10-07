"use client";

import { useSyncExternalStore } from "react";

/**
 * Ilovani o'rnatish holati (PWA). Brauzer "o'rnatish mumkin" hodisasini sahifa ochilishi bilan
 * bir marta yuboradi — shuning uchun u shu modulda ushlab turiladi va tugma bosilganda ishlatiladi.
 *
 *  - "installed" — sayt allaqachon ilova sifatida ochilgan (yoki hozirgina o'rnatildi);
 *  - "prompt"    — brauzer o'rnatish oynasini ko'rsata oladi (Android/kompyuterdagi Chrome, Edge);
 *  - "ios"       — iPhone/iPad: faqat qo'lda, "Ulashish → Bosh ekranga qo'shish" orqali;
 *  - "manual"    — boshqa brauzerlar: brauzer menyusi orqali.
 */
export type InstallState = "installed" | "prompt" | "ios" | "manual";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Brauzerning o'z kichik paneli o'rniga o'zimizning tugma ishlatiladi
    e.preventDefault();
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    justInstalled = true;
    emit();
  });
}

function getState(): InstallState {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone || justInstalled) return "installed";
  if (deferred) return "prompt";
  // iPadOS o'zini "Macintosh" deb tanishtiradi — sensorli ekran borligidan ajratiladi
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "manual";
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** Serverda va birinchi chizishda — null (brauzer imkoniyatlari hali noma'lum). */
export function useInstallState(): InstallState | null {
  return useSyncExternalStore(subscribe, getState, () => null);
}

/** Brauzerning o'rnatish oynasini ochadi. Foydalanuvchi rozi bo'lsa — true. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // Hodisa bir martalik: rad etilsa ham qayta ishlatib bo'lmaydi
  deferred = null;
  emit();
  return outcome === "accepted";
}
