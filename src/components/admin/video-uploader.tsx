"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as tus from "tus-js-client";
import { CheckCircle2, Loader2, RefreshCw, Trash2, UploadCloud, WifiOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/modal";
import { useAction } from "@/hooks/use-action";
import { formatBytes, formatDuration } from "@/lib/file-types";
import {
  finishVideoUploadAction, refreshVideoStatusAction, removeVideoAction, startVideoUploadAction,
} from "@/server/actions/admin";

type VideoStatus = "NONE" | "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
type Progress = { sent: number; total: number };

const VIDEO_EXT = /\.(mp4|mov|mkv|webm|m4v|avi)$/i;

/**
 * Videoni brauzerdan to'g'ridan-to'g'ri video xizmatiga TUS protokoli bilan yuklaydi.
 * Internet uzilsa avtomatik qayta urinadi; sahifa yopilib qolgan bo'lsa ham,
 * o'sha fayl qayta tanlanganda to'xtagan joyidan davom etadi.
 */
/** Brauzerning o'zida video davomiyligini aniqlaydi (serverda ffmpeg kerak bo'lmasin). */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    const done = (v: number) => { URL.revokeObjectURL(url); resolve(Number.isFinite(v) ? Math.round(v) : 0); };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(el.duration);
    el.onerror = () => done(0);
    el.src = url;
  });
}

const LOCAL_ERRORS: Record<number, string> = { 413: "videoTooLarge", 415: "videoWrongTypeLocal" };

/**
 * `mode="local"` — Bunny Stream ulanmagan: video to'g'ridan-to'g'ri saytning o'z serveriga yuklanadi
 * (brauzerda o'ynatiladigan MP4/WebM bo'lishi kerak).
 */
export function VideoUploader({ lessonId, status, durationSec, mode = "bunny" }: {
  lessonId: string; status: VideoStatus; durationSec: number; mode?: "bunny" | "local";
}) {
  const t = useTranslations("admin.lesson");
  const router = useRouter();
  const uploadRef = useRef<tus.Upload | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = useAction(removeVideoAction, { onSuccess: () => setProgress(null) });
  const uploading = progress !== null;

  // Yuklash paytida sahifani tasodifan yopib yuborishdan ogohlantirish
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  useEffect(() => () => { uploadRef.current?.abort(); xhrRef.current?.abort(); }, []);

  // Qayta ishlash tugaganini bilish uchun har 8 soniyada holatni so'raymiz
  const poll = useCallback(async () => {
    const res = await refreshVideoStatusAction({ lessonId });
    if (res.ok && res.data.videoStatus !== "PROCESSING") router.refresh();
    if (!res.ok) setError(res.error);
  }, [lessonId, router]);

  useEffect(() => {
    if (status !== "PROCESSING" || uploading) return;
    const timer = setInterval(poll, 8000);
    return () => clearInterval(timer);
  }, [status, uploading, poll]);

  async function startLocal(file: File) {
    setProgress({ sent: 0, total: file.size });
    const duration = await readDuration(file);
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `/api/admin/lessons/${lessonId}/video`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("X-Duration", String(duration));
    xhr.upload.onprogress = (e) => setProgress({ sent: e.loaded, total: e.total || file.size });
    xhr.onload = () => {
      xhrRef.current = null;
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) router.refresh();
      else setError(t((LOCAL_ERRORS[xhr.status] ?? "videoUploadFailed") as "videoWrongType"));
    };
    xhr.onerror = () => { xhrRef.current = null; setProgress(null); setError(t("videoUploadFailed")); };
    xhr.onabort = () => { xhrRef.current = null; setProgress(null); };
    xhr.send(file);
  }

  async function start(file: File) {
    setError(null);
    if (!file.type.startsWith("video/") && !VIDEO_EXT.test(file.name)) {
      setError(t("videoWrongType"));
      return;
    }
    if (mode === "local") return startLocal(file);
    setProgress({ sent: 0, total: file.size });

    const res = await startVideoUploadAction({ lessonId });
    if (!res.ok) {
      setProgress(null);
      setError(res.error);
      return;
    }
    const creds = res.data;

    const upload = new tus.Upload(file, {
      endpoint: creds.endpoint,
      // Uzilishda qayta urinishlar orasidagi kutish (ms) — jami bir necha daqiqa
      retryDelays: [0, 3000, 5000, 10000, 20000, 30000, 60000, 60000, 60000],
      chunkSize: 50 * 1024 * 1024,
      headers: {
        AuthorizationSignature: creds.signature,
        AuthorizationExpire: String(creds.expire),
        VideoId: creds.videoId,
        LibraryId: creds.libraryId,
      },
      metadata: { filetype: file.type || "video/mp4", title: file.name },
      onProgress: (sent, total) => { setRetrying(false); setProgress({ sent, total }); },
      onShouldRetry: () => { setRetrying(true); return true; },
      onError: () => {
        setRetrying(false);
        setProgress(null);
        setError(t("videoPaused"));
        router.refresh();
      },
      onSuccess: async () => {
        await finishVideoUploadAction({ lessonId });
        uploadRef.current = null;
        setProgress(null);
        router.refresh();
      },
    });
    uploadRef.current = upload;

    // Shu fayl avval chala yuklangan bo'lsa — to'xtagan joyidan davom etadi
    const previous = await upload.findPreviousUploads().catch(() => []);
    if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
    upload.start();
  }

  const cancel = async () => {
    if (xhrRef.current) return xhrRef.current.abort();
    await uploadRef.current?.abort(true).catch(() => undefined);
    uploadRef.current = null;
    setProgress(null);
    remove.run({ lessonId });
  };

  const picker = (label: string, variant: "primary" | "outline" = "primary") => (
    <>
      <input
        ref={inputRef} type="file" accept={mode === "local" ? "video/mp4,video/webm,.mp4,.m4v,.webm" : "video/*,.mkv"} className="sr-only" tabIndex={-1}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void start(f); }}
      />
      <Button type="button" variant={variant} onClick={() => inputRef.current?.click()}>
        <UploadCloud className="size-5" /> {label}
      </Button>
    </>
  );

  const removeButton = (
    <ConfirmButton
      trigger={<><Trash2 className="size-4" /> {t("videoRemove")}</>} className="text-danger" size="md"
      title={t("videoRemoveTitle")} text={t("videoRemoveText")} confirmLabel={t("videoRemove")}
      onConfirm={() => remove.run({ lessonId })} pending={remove.pending} error={remove.error}
    />
  );

  const percent = progress && progress.total > 0 ? Math.floor((progress.sent / progress.total) * 100) : 0;

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}

      {uploading ? (
        <div className="space-y-3 rounded-xl bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span className="flex items-center gap-2">
              {retrying ? <WifiOff className="size-4 text-danger" /> : <Loader2 className="size-4 animate-spin text-brand" />}
              {retrying ? t("videoRetrying") : t("videoUploading", { percent })}
            </span>
            <span className="tabular-nums text-muted">
              {t("videoUploadingMeta", { done: formatBytes(progress.sent), total: formatBytes(progress.total) })}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">{t("videoKeepOpen")}</p>
            <Button type="button" variant="ghost" size="sm" onClick={cancel}>{t("videoCancel")}</Button>
          </div>
        </div>
      ) : status === "UPLOADING" ? (
        <div className="space-y-3 rounded-xl bg-accent-soft p-4">
          <p className="text-sm font-semibold text-accent-fg dark:text-accent">{t("videoResumeHint")}</p>
          <div className="flex flex-wrap gap-2">{picker(t("videoResume"))}{removeButton}</div>
        </div>
      ) : status === "PROCESSING" ? (
        <div className="space-y-3 rounded-xl bg-brand-soft p-4">
          <p className="flex items-center gap-2 font-semibold text-brand"><Loader2 className="size-5 animate-spin" /> {t("videoProcessing")}</p>
          <p className="text-sm text-muted">{t("videoProcessingHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={poll}><RefreshCw className="size-4" /> {t("videoCheck")}</Button>
          </div>
        </div>
      ) : status === "READY" ? (
        <div className="space-y-3 rounded-xl bg-success-soft p-4">
          <p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5" /> {t("videoReady")}</p>
          {durationSec > 0 && <p className="text-sm text-muted">{t("duration", { value: formatDuration(durationSec) })}</p>}
          <div className="flex flex-wrap gap-2">{picker(t("videoReplace"), "outline")}{removeButton}</div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line px-4 py-8 text-center">
          {status === "FAILED" && <Alert>{t("videoFailed")}</Alert>}
          <p className="font-semibold">{t("videoNone")}</p>
          <p className="max-w-sm text-sm text-muted">{mode === "local" ? t("videoPickHintLocal") : t("videoPickHint")}</p>
          {picker(t("videoPick"))}
        </div>
      )}
    </div>
  );
}
