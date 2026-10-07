"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, QrCode, ScanLine, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LogoOrnament } from "@/components/ui/logo";
import { checkInAction } from "@/server/actions/student";
import { cn } from "@/lib/cn";

type Done = { title: string; markedAt: string; already: boolean };
type Phase = "idle" | "scanning" | "checking" | "done";

/** QR ichidagi matndan davomat kodini ajratadi: ".../kabinet/davomat?c=<kod>" → "<kod>". Boshqa QR bo'lsa — null. */
function extractCode(text: string): string | null {
  try {
    const url = new URL(text);
    return url.pathname === "/kabinet/davomat" ? url.searchParams.get("c") : null;
  } catch {
    return null;
  }
}

const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/**
 * Darsga kelganini tasdiqlash: kamerani ochib, ustoz ekranidagi QR kodni o'qiydi.
 * `initialCode` — telefonning oddiy kamerasi bilan skaner qilinganda havoladan kelgan kod (darhol yuboriladi).
 */
export function AttendanceScanner({ initialCode }: { initialCode?: string }) {
  const t = useTranslations("student.attendance");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(initialCode ? "checking" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const busy = useRef(false);

  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  const submit = useCallback(async (code: string) => {
    if (busy.current) return;
    busy.current = true;
    stopCamera();
    setPhase("checking");
    setError(null);
    try {
      const res = await checkInAction({ code });
      if (res.ok) {
        setDone(res.data);
        setPhase("done");
        navigator.vibrate?.(120);
        // Manzildagi kod olib tashlanadi (sahifa yangilansa qayta yuborilmasin) va tarix yangilanadi
        router.replace("/kabinet/davomat");
      } else {
        setError(res.error);
        setPhase("idle");
      }
    } catch {
      setError("Server bilan bog‘lanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.");
      setPhase("idle");
    } finally {
      busy.current = false;
    }
  }, [router, stopCamera]);

  // Havola orqali kelgan kod — sahifa ochilishi bilan yuboriladi
  const sent = useRef(false);
  useEffect(() => {
    if (!initialCode || sent.current) return;
    sent.current = true;
    void submit(initialCode);
  }, [initialCode, submit]);

  useEffect(() => stopCamera, [stopCamera]);

  // Kamera ochiq turganda kadrlar ichidan QR kod qidiriladi
  useEffect(() => {
    if (phase !== "scanning") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unavailable");
        const [media, { default: jsQR }] = await Promise.all([
          navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false }),
          import("jsqr"),
        ]);
        if (cancelled) return media.getTracks().forEach((track) => track.stop());
        stream.current = media;
        const el = video.current;
        if (!el || !ctx) throw new Error("unavailable");
        el.srcObject = media;
        await el.play();

        const tick = () => {
          if (cancelled) return;
          if (el.readyState >= 2 && el.videoWidth) {
            // Kichraytirilgan kadr tezroq o'qiladi; QR uchun 640px yetarli
            const scale = Math.min(1, 640 / Math.max(el.videoWidth, el.videoHeight));
            canvas.width = Math.round(el.videoWidth * scale);
            canvas.height = Math.round(el.videoHeight * scale);
            ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hit = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
            if (hit?.data) {
              const code = extractCode(hit.data);
              if (code) return void submit(code);
              setError(t("notOurCode"));
            }
          }
          timer = setTimeout(tick, 150);
        };
        tick();
      } catch (e) {
        if (cancelled) return;
        stopCamera();
        const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
        setError(denied ? t("cameraDenied") : t("cameraUnavailable"));
        setPhase("idle");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopCamera();
    };
  }, [phase, submit, stopCamera, t]);

  if (phase === "done" && done) {
    return (
      <div role="status" className="relative overflow-hidden rounded-3xl bg-success p-6 text-center text-white shadow-xl dark:text-brand-deep sm:p-8">
        <LogoOrnament className="pointer-events-none absolute -right-16 -top-16 size-64 text-white opacity-10 [--mark-hole:transparent]" />
        <CheckCircle2 className="relative mx-auto size-20 animate-[menu-in_0.3s_ease-out]" strokeWidth={1.75} />
        <p className="relative mt-3 font-display text-2xl font-black">{done.already ? t("alreadyTitle") : t("successTitle")}</p>
        <p className="relative mt-1 font-semibold opacity-90">{t("successText", { title: done.title, time: time(done.markedAt) })}</p>
        <Button type="button" variant="outline" className="relative mt-5 border-transparent text-fg" onClick={() => { setDone(null); setPhase("idle"); }}>
          <QrCode className="size-4" /> {t("again")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="relative overflow-hidden rounded-3xl bg-brand text-brand-fg shadow-xl shadow-brand/30 [--mark-hole:var(--brand)]">
        {phase === "scanning" ? (
          <div className="relative bg-black">
            <video ref={video} playsInline muted className="aspect-[3/4] w-full object-cover sm:aspect-video" />
            {/* Nishon ramkasi va yuguruvchi chiziq */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative size-56 overflow-hidden rounded-3xl border-4 border-white/90 shadow-[0_0_0_100vmax_rgb(0_0_0/0.45)]">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-white shadow-[0_0_12px_2px_white] [animation:scan-line_2.4s_ease-in-out_infinite]" />
              </div>
            </div>
            <p className="absolute inset-x-0 top-4 px-4 text-center text-sm font-bold text-white drop-shadow">{t("aim")}</p>
            <button
              type="button" onClick={() => setPhase("idle")}
              className="absolute bottom-4 left-1/2 inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-fg shadow-lg"
            >
              <X className="size-4" strokeWidth={3} /> {t("stop")}
            </button>
          </div>
        ) : (
          <div className="relative flex flex-col items-center px-5 py-8 text-center sm:py-10">
            <LogoOrnament className="pointer-events-none absolute -right-16 -top-16 size-64 text-on-brand opacity-25" />
            <div className="bg-dots pointer-events-none absolute bottom-5 left-5 h-14 w-24 text-white/20" aria-hidden />
            <span className={cn("relative grid size-20 place-items-center rounded-3xl bg-white text-brand shadow-lg", phase === "checking" && "animate-pulse")}>
              <ScanLine className="size-10" />
            </span>
            <Button
              type="button" size="lg" disabled={phase === "checking"}
              onClick={() => { setError(null); setPhase("scanning"); }}
              className="relative mt-5 h-14 bg-white px-9 text-base text-brand shadow-lg shadow-black/15 hover:bg-white/90"
            >
              <QrCode className="size-5" /> {phase === "checking" ? t("checking") : t("scan")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
