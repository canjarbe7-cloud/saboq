"use client";

import { useEffect } from "react";
// Modul yuklanishi bilan "o'rnatish mumkin" hodisasini tinglay boshlaydi — shuning uchun ildiz layout'da turadi
import "@/lib/install-prompt";

/** Service worker'ni ro'yxatdan o'tkazadi (internet yo'q paytdagi sahifa uchun — public/sw.js). */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
