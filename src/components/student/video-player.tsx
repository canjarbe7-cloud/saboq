"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type Hls from "hls.js";
import { Loader2, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Settings, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/file-types";
import { cn } from "@/lib/cn";

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const ERROR_BY_STATUS: Record<number, string> = { 403: "forbidden", 404: "noVideo", 429: "rateLimited", 503: "notConfigured" };

type Level = { index: number; height: number };

/**
 * HLS video pleyer:
 *  - imzolangan qisqa muddatli havolani serverdan oladi (havola eskirsa, o'zi yangilaydi);
 *  - tezlik va sifat tanlash, to'xtagan joydan davom ettirish;
 *  - video ustida o'quvchi ismi va telefoni yozilgan, joyi o'zgarib turadigan watermark.
 * To'liq ekran <video> emas, butun konteyner uchun yoqiladi — watermark ko'rinib turishi uchun.
 */
export function VideoPlayer({ lessonId, startAt, watermark, onEnded }: {
  lessonId: string; startAt: number; watermark: string; onEnded?: () => void;
}) {
  const t = useTranslations("student.player");
  const tc = useTranslations("common");
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSaved = useRef(-1);

  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorKey, setErrorKey] = useState("generic");
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [current, setCurrent] = useState(startAt);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [levels, setLevels] = useState<Level[]>([]);
  const [level, setLevel] = useState(-1);
  const [menu, setMenu] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controls, setControls] = useState(true);
  const [mark, setMark] = useState({ top: 8, left: 6 });

  /* ── To'xtagan joyni saqlash ── */
  const save = useCallback((useBeacon = false) => {
    const video = videoRef.current;
    if (!video || !video.currentTime) return;
    const positionSec = Math.floor(video.currentTime);
    if (positionSec === lastSaved.current) return;
    lastSaved.current = positionSec;
    const url = `/api/lessons/${lessonId}/progress`;
    const body = JSON.stringify({ positionSec });
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
    }
  }, [lessonId]);

  useEffect(() => {
    const timer = setInterval(() => { if (!videoRef.current?.paused) save(); }, 15_000);
    const onHide = () => save(true);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      save(true);
    };
  }, [save]);

  /* ── Videoni yuklash ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let refreshed = false;

    const fail = (key: string) => { if (!cancelled) { setErrorKey(key); setState("error"); } };
    const fetchSource = async (): Promise<{ url: string; kind?: "file" } | null> => {
      const res = await fetch(`/api/lessons/${lessonId}/playback`, { cache: "no-store" }).catch(() => null);
      if (!res) return fail("generic"), null;
      if (!res.ok) return fail(ERROR_BY_STATUS[res.status] ?? "generic"), null;
      return (await res.json()) as { url: string; kind?: "file" };
    };
    const fetchUrl = async () => (await fetchSource())?.url ?? null;

    (async () => {
      const source = await fetchSource();
      if (!source || cancelled) return;
      const { url } = source;
      const resumeAt = lastSaved.current > 0 ? lastSaved.current : startAt;

      // Serverda saqlangan oddiy video fayl (Bunny ulanmagan holat) — HLS kerak emas
      if (source.kind === "file") {
        video.src = url;
        video.addEventListener("loadedmetadata", () => { if (resumeAt > 0) video.currentTime = resumeAt; setState("ready"); }, { once: true });
        video.addEventListener("error", () => fail("generic"), { once: true });
        return;
      }

      const { default: HlsLib } = await import("hls.js");
      if (cancelled) return;

      if (HlsLib.isSupported()) {
        const hls = new HlsLib({ startPosition: resumeAt, maxBufferLength: 30 });
        hlsRef.current = hls;
        hls.on(HlsLib.Events.MANIFEST_PARSED, (_e, data) => {
          setLevels(data.levels.map((l, index) => ({ index, height: l.height })).filter((l) => l.height > 0).sort((a, b) => b.height - a.height));
          setState("ready");
        });
        hls.on(HlsLib.Events.ERROR, async (_e, data) => {
          if (!data.fatal) return;
          if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) return hls.recoverMediaError();
          // Havola muddati tugagan bo'lishi mumkin — bir marta yangisini olib, davom ettiramiz
          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR && !refreshed) {
            refreshed = true;
            const fresh = await fetchUrl();
            if (fresh && !cancelled) {
              const at = video.currentTime;
              hls.loadSource(fresh);
              hls.startLoad(at);
              setTimeout(() => { refreshed = false; }, 60_000);
            }
            return;
          }
          fail("generic");
        });
        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari / iPhone: HLS brauzerning o'zida ishlaydi
        video.src = url;
        video.addEventListener("loadedmetadata", () => { if (resumeAt > 0) video.currentTime = resumeAt; setState("ready"); }, { once: true });
        video.addEventListener("error", () => fail("generic"), { once: true });
      } else fail("generic");
    })();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [lessonId, startAt, attempt]);

  /* ── Watermark joyini vaqti-vaqti bilan o'zgartirish ── */
  useEffect(() => {
    const move = () => setMark({ top: 5 + Math.random() * 75, left: 4 + Math.random() * 55 });
    const timer = setInterval(move, 12_000);
    return () => clearInterval(timer);
  }, []);

  /* ── To'liq ekran ── */
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => setFullscreen((f) => !f));
    else setFullscreen((f) => !f); // iPhone: element to'liq ekrani yo'q — CSS orqali kengaytiramiz
  };

  /* ── Boshqaruv ── */
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || state !== "ready") return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  };
  const seekBy = (delta: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
  };
  const changeRate = (r: number) => { if (videoRef.current) videoRef.current.playbackRate = r; setRate(r); };
  const changeLevel = (index: number) => { if (hlsRef.current) hlsRef.current.currentLevel = index; setLevel(index); };

  const wake = useCallback(() => {
    setControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (!videoRef.current?.paused) { setControls(false); setMenu(false); } }, 3000);
  }, []);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const actions: Record<string, () => void> = {
      " ": togglePlay, k: togglePlay, ArrowLeft: () => seekBy(-10), ArrowRight: () => seekBy(10), f: toggleFullscreen,
      m: () => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; },
    };
    const action = actions[e.key];
    if (action) { e.preventDefault(); action(); wake(); }
  };

  const iconBtn = "grid size-10 shrink-0 place-items-center rounded-lg text-white/90 hover:bg-white/15 hover:text-white";
  const visible = controls || !playing || menu;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={wake}
      onTouchStart={wake}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "group relative overflow-hidden bg-black text-white outline-none select-none",
        fullscreen ? "fixed inset-0 z-50" : "aspect-video w-full shadow-card sm:rounded-2xl",
        !visible && "cursor-none",
      )}
    >
      <video
        ref={videoRef}
        className="size-full"
        playsInline
        disablePictureInPicture
        controlsList="nodownload noremoteplayback"
        onClick={togglePlay}
        onPlay={() => { setPlaying(true); wake(); }}
        onPause={() => { setPlaying(false); save(); }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        // Qayta yuklangandan keyin ham tanlangan tezlik saqlanib qolsin
        onLoadedMetadata={(e) => { e.currentTarget.playbackRate = rate; }}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        onEnded={() => { save(); onEnded?.(); }}
      />

      {/* Watermark: ekrandan yozib olingan videoda kimniki ekani ko'rinib turadi */}
      {state === "ready" && (
        <div
          aria-hidden
          className="pointer-events-none absolute whitespace-nowrap text-xs font-semibold text-white/35 [text-shadow:0_0_2px_rgb(0_0_0/0.6)] sm:text-sm"
          style={{ top: `${mark.top}%`, left: `${mark.left}%` }}
        >
          {watermark}
        </div>
      )}

      {state === "loading" && (
        <div className="absolute inset-0 grid place-items-center" role="status">
          <div className="flex flex-col items-center gap-3 text-sm text-white/80">
            <Loader2 className="size-10 animate-spin" /> {t("loading")}
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center" role="alert">
          <div className="space-y-4">
            <p className="max-w-sm text-sm text-white/90 sm:text-base">{t(`errors.${errorKey}` as "errors.generic")}</p>
            {errorKey === "generic" && (
              <Button type="button" variant="primary" size="sm" onClick={() => { setState("loading"); setAttempt((a) => a + 1); }}>
                <RotateCw className="size-4" /> {tc("retry")}
              </Button>
            )}
          </div>
        </div>
      )}

      {state === "ready" && (
        <>
          {waiting && playing && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <Loader2 className="size-12 animate-spin text-white/90" />
            </div>
          )}

          {!playing && (
            <button type="button" onClick={togglePlay} aria-label={t("play")} className="absolute inset-0 grid place-items-center bg-black/25">
              <span className="grid size-16 place-items-center rounded-full bg-brand text-white shadow-2xl transition-transform hover:scale-105 sm:size-20">
                <Play className="ml-1 size-8 fill-current sm:size-10" />
              </span>
            </button>
          )}

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-10 transition-opacity duration-200 sm:px-3",
              fullscreen && "pb-[max(0.375rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]",
              visible ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <input
              type="range" min={0} max={duration || 0} step={1} value={Math.min(current, duration || 0)} aria-label={t("seek")}
              onChange={(e) => { const v = Number(e.target.value); setCurrent(v); if (videoRef.current) videoRef.current.currentTime = v; }}
              className="h-1.5 w-full cursor-pointer accent-(--accent)"
            />
            <div className="flex items-center gap-0.5">
              <button type="button" className={iconBtn} onClick={togglePlay} aria-label={playing ? t("pause") : t("play")}>
                {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
              </button>
              <button type="button" className={iconBtn} onClick={() => seekBy(-10)} aria-label={t("back10")}><RotateCcw className="size-5" /></button>
              <button type="button" className={iconBtn} onClick={() => seekBy(10)} aria-label={t("forward10")}><RotateCw className="size-5" /></button>
              <button type="button" className={cn(iconBtn, "hidden sm:grid")} aria-label={muted ? t("unmute") : t("mute")}
                onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }}>
                {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
              <span className="ml-1 text-xs tabular-nums text-white/90 sm:text-sm">
                {formatDuration(current)} / {formatDuration(duration)}
              </span>

              <div className="relative ml-auto">
                <button type="button" className={cn(iconBtn, "w-auto gap-1 px-2 text-sm font-semibold")} onClick={() => setMenu((m) => !m)}
                  aria-label={`${t("speed")} / ${t("quality")}`} aria-expanded={menu}>
                  <Settings className="size-5" /> {rate !== 1 && `${rate}x`}
                </button>
                {menu && (
                  <div className="absolute bottom-12 right-0 max-h-[70vh] w-44 overflow-y-auto rounded-xl bg-black/90 p-2 text-sm shadow-2xl ring-1 ring-white/10">
                    <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-white/50">{t("speed")}</p>
                    <div className="grid grid-cols-3 gap-1">
                      {SPEEDS.map((s) => (
                        <button key={s} type="button" onClick={() => changeRate(s)}
                          className={cn("rounded-lg py-1.5 font-semibold", s === rate ? "bg-brand text-white" : "hover:bg-white/15")}>
                          {s}x
                        </button>
                      ))}
                    </div>
                    {levels.length > 1 && (
                      <>
                        <p className="mt-2 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white/50">{t("quality")}</p>
                        {[{ index: -1, height: 0 }, ...levels].map((l) => (
                          <button key={l.index} type="button" onClick={() => changeLevel(l.index)}
                            className={cn("block w-full rounded-lg px-2 py-1.5 text-left font-semibold", l.index === level ? "bg-brand text-white" : "hover:bg-white/15")}>
                            {l.index === -1 ? t("auto") : `${l.height}p`}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              <button type="button" className={iconBtn} onClick={toggleFullscreen} aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}>
                {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
