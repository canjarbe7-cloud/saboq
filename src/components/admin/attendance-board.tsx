"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Maximize2, Minimize2, Trash2, Users, X } from "lucide-react";
import { PageHeader } from "@/components/admin/admin-shell";
import { Alert } from "@/components/ui/alert";
import { Badge, EmptyState } from "@/components/ui/card";
import { LogoOrnament } from "@/components/ui/logo";
import { ConfirmButton } from "@/components/ui/modal";
import { useAction } from "@/hooks/use-action";
import { closeAttendanceAction, deleteAttendanceAction, setAttendanceAction } from "@/server/actions/admin";
import type { RosterRow } from "@/server/services/attendance";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type View = { id: string; title: string; startedAt: string; closed: boolean; open: boolean; roster: RosterRow[] };
type Live = View & { qr: string | null; msLeft: number };

/** Ro'yxat va kod shu oraliqda yangilanadi. */
const POLL_MS = 2500;

const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/**
 * Davomat ekrani: chapda — o'quvchilar skaner qiladigan QR kod (o'zi yangilanib turadi),
 * o'ngda — kim kelgani jonli ro'yxati. Admin har bir o'quvchini qo'lda ham belgilay oladi.
 */
export function AttendanceBoard({ initial }: { initial: View }) {
  const t = useTranslations("admin.attendance");
  const tc = useTranslations("common");
  const router = useRouter();
  const [data, setData] = useState<Live>({ ...initial, qr: null, msLeft: 0 });
  const [offline, setOffline] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/attendance/${initial.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const next: Live = await res.json();
      // Kod o'zgarmagan bo'lsa, qolgan vaqt chizig'i qayta boshlanmasin
      setData((prev) => (prev.qr === next.qr ? { ...next, msLeft: prev.msLeft } : next));
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [initial.id]);

  // Davomat ochiq turganda kod va ro'yxat yangilanib turadi; yopilgach so'rovlar to'xtaydi
  const polling = !data.closed;
  useEffect(() => {
    if (!polling) return;
    const first = setTimeout(load, 0);
    const timer = setInterval(load, POLL_MS);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [polling, load]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === panel.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const mark = useAction(setAttendanceAction, { refresh: false, onSuccess: load });
  const close = useAction(closeAttendanceAction, { onSuccess: load });
  const del = useAction(deleteAttendanceAction, { refresh: false, onSuccess: () => router.push("/admin/davomat") });

  const present = data.roster.filter((r) => r.status === "PRESENT");
  const total = data.roster.length;
  const percent = total ? Math.round((present.length / total) * 100) : 0;
  // To'liq ekranda: oxirgi kelganlar (yangi kelgan o'quvchi o'z ismini ko'radi)
  const latest = [...present].sort((a, b) => (b.markedAt ?? "").localeCompare(a.markedAt ?? "")).slice(0, 6);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void panel.current?.requestFullscreen?.().catch(() => {});
  };

  return (
    <>
      <PageHeader
        title={data.title}
        back={{ href: "/admin/davomat", label: t("back") }}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {data.open ? (
              <Badge tone="brand"><span className="size-1.5 animate-pulse rounded-full bg-brand" />{t("open")}</Badge>
            ) : data.closed ? (
              <Badge>{t("closed")}</Badge>
            ) : null}
            {!data.closed && (
              <ConfirmButton
                trigger={t("finish")} triggerVariant="danger" size="md" variant="primary"
                title={t("finishTitle")} text={t("finishText")} confirmLabel={t("finish")}
                onConfirm={() => close.run({ id: data.id })} pending={close.pending} error={close.error}
              />
            )}
            {data.closed && (
              <ConfirmButton
                trigger={<><Trash2 className="size-4" /> {tc("delete")}</>} className="text-danger"
                title={t("deleteTitle")} text={t("deleteText")} confirmLabel={tc("delete")}
                onConfirm={() => del.run({ id: data.id })} pending={del.pending} error={del.error}
              />
            )}
          </div>
        }
      />
      <p className="-mt-4 mb-5 text-sm tabular-nums text-muted">{formatDateTime(data.startedAt)}</p>

      {offline && !data.closed && <div className="mb-4"><Alert>{t("connectionLost")}</Alert></div>}
      {!data.open && !data.closed && <div className="mb-4"><Alert>{t("autoClosed")}</Alert></div>}
      {mark.error && <div className="mb-4"><Alert>{mark.error}</Alert></div>}

      <div className={cn("grid grid-cols-1 items-start gap-5", data.open && "xl:grid-cols-[minmax(0,1fr)_24rem]")}>
        {data.open && (
          <div
            ref={panel}
            className="relative flex flex-col items-center overflow-hidden rounded-3xl bg-brand p-5 text-center text-brand-fg shadow-xl shadow-brand/30 [--mark-hole:var(--brand)] sm:p-8 [&:fullscreen]:justify-center [&:fullscreen]:rounded-none"
          >
            <LogoOrnament className="pointer-events-none absolute -right-24 -top-24 size-96 animate-spin-slow text-on-brand opacity-25" />
            <div className="bg-dots pointer-events-none absolute bottom-6 left-6 h-20 w-36 text-white/20" aria-hidden />
            <button
              type="button" onClick={toggleFullscreen} title={fullscreen ? t("exitFullscreen") : t("fullscreen")}
              aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
            >
              {fullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
            </button>

            <h2 className={cn("relative max-w-2xl text-balance px-10 text-2xl font-black sm:text-3xl", fullscreen && "sm:text-5xl")}>{t("scanTitle")}</h2>
            <p className={cn("relative mt-2 font-medium text-white/85", fullscreen && "text-xl")}>{t("scanHint")}</p>

            <div className={cn("relative mt-6 w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl", fullscreen && "max-w-[min(62vh,90vw)]")}>
              {data.qr ? (
                // QR kod — serverda chizilgan SVG (data-URL); next/image bunga kerak emas
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.qr} alt="QR" className="aspect-square w-full [image-rendering:pixelated]" />
              ) : (
                <div className="aspect-square w-full animate-pulse rounded-2xl bg-brand-soft" />
              )}
              {/* Kod almashguncha qolgan vaqt: har yangi kodda chiziq qaytadan to'ladi */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-soft">
                {data.qr && (
                  <div
                    key={data.qr}
                    className="h-full origin-left rounded-full bg-brand [animation:qr-countdown_linear_forwards]"
                    style={{ animationDuration: `${data.msLeft}ms` }}
                  />
                )}
              </div>
            </div>
            <p className="relative mt-3 text-sm font-semibold text-white/70">{t("codeRefresh")}</p>

            <div className="relative mt-6 flex items-end gap-3">
              <span className={cn("font-display text-6xl font-black tabular-nums leading-none", fullscreen && "text-8xl")}>{present.length}</span>
              <span className="pb-1 text-left text-sm font-bold leading-tight text-white/80">
                {t("arrived")}<br />{t("ofTotal", { total })}
              </span>
            </div>
            {fullscreen && latest.length > 0 && (
              <ul className="relative mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
                {latest.map((r) => (
                  <li key={r.userId} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-base font-extrabold text-brand">
                    <Check className="size-4" strokeWidth={3.5} /> {r.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <div className="border-b border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">{t("roster")}</h2>
              <span className="text-sm font-extrabold tabular-nums text-brand">{present.length} / {total}</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-brand-soft">
              <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${percent}%` }} />
            </div>
          </div>

          {total === 0 ? (
            <div className="p-4"><EmptyState icon={<Users className="size-7" />} title={t("noStudents")} text={t("noStudentsText")} /></div>
          ) : (
            <ul className={cn("divide-y divide-line", data.open && "xl:max-h-[38rem] xl:overflow-y-auto")}>
              {data.roster.map((r) => (
                <li key={r.userId} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{r.name}</span>
                    <span className="block text-xs text-muted">
                      {r.status === "PRESENT" && r.markedAt
                        ? `${time(r.markedAt)} · ${r.method === "QR" ? t("byQr") : t("byHand")}`
                        : r.status === "ABSENT" ? t("absent") : t("waiting")}
                    </span>
                  </span>
                  {/* Bor / Yo'q — bosilgani bo'yalgan holda turadi */}
                  <span className="flex shrink-0 gap-1.5">
                    <button
                      type="button" disabled={mark.pending} aria-pressed={r.status === "PRESENT"} title={t("markPresent")} aria-label={`${r.name}: ${t("markPresent")}`}
                      onClick={() => mark.run({ sessionId: data.id, userId: r.userId, present: true })}
                      className={cn(
                        "inline-flex h-10 items-center gap-1 rounded-full px-3.5 text-sm font-extrabold transition-colors",
                        r.status === "PRESENT" ? "bg-success text-white dark:text-brand-deep" : "bg-surface-2 text-muted hover:bg-success-soft hover:text-success",
                      )}
                    >
                      <Check className="size-4" strokeWidth={3} /> {t("present")}
                    </button>
                    <button
                      type="button" disabled={mark.pending} aria-pressed={r.status === "ABSENT"} title={t("markAbsent")} aria-label={`${r.name}: ${t("markAbsent")}`}
                      onClick={() => mark.run({ sessionId: data.id, userId: r.userId, present: false })}
                      className={cn(
                        "inline-flex h-10 items-center gap-1 rounded-full px-3.5 text-sm font-extrabold transition-colors",
                        r.status === "ABSENT" ? "bg-danger text-white dark:text-brand-deep" : "bg-surface-2 text-muted hover:bg-danger-soft hover:text-danger",
                      )}
                    >
                      <X className="size-4" strokeWidth={3} /> {t("absent")}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
