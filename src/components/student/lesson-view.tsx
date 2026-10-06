"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, PartyPopper } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { VideoPlayer } from "./video-player";
import { useAction } from "@/hooks/use-action";
import { ACHIEVEMENTS, type AchievementCode } from "@/lib/achievements";
import { setLessonCompletedAction } from "@/server/actions/student";
import { cn } from "@/lib/cn";

type Neighbor = { id: string; title: string } | null;

/**
 * Pleyer + "Darsni tugatdim" + oldingi/keyingi dars + yangi yutuq haqida xabar.
 * `lastRemaining` — kursda tugatilmagan yagona dars shu (belgilansa, kurs to'liq tugaydi).
 */
export function LessonView({ lessonId, startAt, watermark, initialCompleted, hasVideo, prev, next, lastRemaining }: {
  lessonId: string; startAt: number; watermark: string; initialCompleted: boolean; hasVideo: boolean;
  prev: Neighbor; next: Neighbor; lastRemaining: boolean;
}) {
  const t = useTranslations("student");
  const [completed, setCompleted] = useState(initialCompleted);
  const [earned, setEarned] = useState<AchievementCode[]>([]);
  const [celebrate, setCelebrate] = useState(false);

  const { run, pending, error } = useAction(setLessonCompletedAction, {
    onSuccess: ({ earned }) => {
      if (earned.length) {
        setEarned(earned);
        setTimeout(() => setEarned([]), 6000);
      }
    },
  });

  const mark = (value: boolean) => {
    if (value === completed || pending) return;
    setCompleted(value);
    setCelebrate(value);
    run({ lessonId, completed: value });
  };

  return (
    <div className="space-y-4">
      {/* Videosiz dars (faqat audio/PDF) — materiallar sahifaning pastida */}
      {hasVideo && <VideoPlayer lessonId={lessonId} startAt={startAt} watermark={watermark} onEnded={() => mark(true)} />}

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {completed ? (
            <>
              <motion.span
                initial={celebrate ? { scale: 0.6, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-success-soft px-4 font-bold text-success"
              >
                <CheckCircle2 className="size-5" /> {t("lesson.completed")}
              </motion.span>
              <button type="button" onClick={() => mark(false)} disabled={pending} className="px-1 text-sm font-medium text-muted hover:text-fg hover:underline">
                {t("lesson.undo")}
              </button>
            </>
          ) : (
            <Button type="button" variant="accent" onClick={() => mark(true)} disabled={pending} className="h-11 w-full sm:w-auto">
              <Check className="size-5" strokeWidth={3} /> {t("lesson.complete")}
            </Button>
          )}
        </div>

        {(prev || next) && (
          <nav className="flex gap-2" aria-label={t("lesson.lessonList")}>
            {prev && (
              <Link href={`/kabinet/darslar/${prev.id}`} title={prev.title} className={buttonClass({ variant: "outline" }, "h-11 flex-1 px-4 sm:flex-none")}>
                <ArrowLeft className="size-4" /> {t("lesson.prev")}
              </Link>
            )}
            {next && (
              <Link
                href={`/kabinet/darslar/${next.id}`}
                title={next.title}
                // Dars tugatilgach "Keyingi dars" asosiy tugmaga aylanadi
                className={buttonClass({ variant: completed ? "primary" : "outline" }, cn("h-11 flex-1 px-4 sm:flex-none", completed && "shadow-md shadow-brand/25"))}
              >
                {t("lesson.next")} <ArrowRight className="size-4" />
              </Link>
            )}
          </nav>
        )}
      </div>

      {completed && celebrate && lastRemaining && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div role="status" className="flex items-center gap-3 rounded-2xl bg-success-soft p-4 font-semibold text-success">
            <PartyPopper className="size-6 shrink-0" /> {t("lesson.courseDone")}
          </div>
        </motion.div>
      )}

      {/* Yangi yutuq nishoni */}
      <AnimatePresence>
        {earned.length > 0 && (
          <motion.div
            role="status"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm rounded-2xl bg-brand p-4 text-brand-fg shadow-2xl sm:bottom-6"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-white/70">{t("achievements.earnedToast")}</p>
            {earned.map((code) => (
              <p key={code} className="mt-1 flex items-center gap-3 text-lg font-extrabold">
                <span className="text-3xl">{ACHIEVEMENTS.find((a) => a.code === code)?.emoji}</span>
                {t(`achievements.${code}`)}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
