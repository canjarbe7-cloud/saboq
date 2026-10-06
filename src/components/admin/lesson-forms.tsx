"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, FileText, Music, Trash2, Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { ConfirmButton } from "@/components/ui/modal";
import { useAction } from "@/hooks/use-action";
import { MATERIAL_ACCEPT, MATERIAL_MAX_BYTES, formatBytes } from "@/lib/file-types";
import { deleteLessonAction, deleteMaterialAction, updateLessonAction } from "@/server/actions/admin";

type Status = "DRAFT" | "PUBLISHED";

export function LessonForm({ lesson, courseId, videoReady }: {
  lesson: { id: string; title: string; description: string; status: Status }; courseId: string; videoReady: boolean;
}) {
  const t = useTranslations("admin.lesson");
  const tCourses = useTranslations("admin.courses");
  const tc = useTranslations("common");
  const router = useRouter();
  const [form, setForm] = useState(lesson);
  const [saved, setSaved] = useState(false);
  const save = useAction(updateLessonAction, { onSuccess: () => setSaved(true) });
  const del = useAction(deleteLessonAction, { refresh: false, onSuccess: () => router.push(`/admin/kurslar/${courseId}`) });
  const set = (v: Partial<typeof form>) => { setSaved(false); setForm((f) => ({ ...f, ...v })); };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.run(form); }}>
      {save.error && <Alert>{save.error}</Alert>}
      {saved && !save.error && <Alert kind="success">{tc("saved")}</Alert>}
      <Field label={t("title")} required maxLength={140} value={form.title} onChange={(e) => set({ title: e.target.value })} />
      <Textarea label={t("description")} maxLength={5000} value={form.description} onChange={(e) => set({ description: e.target.value })} className="min-h-40" />
      <p className="-mt-2 text-xs text-muted">{t("descriptionHint")}</p>
      <Select label={tCourses("status")} value={form.status} onChange={(e) => set({ status: e.target.value as Status })}>
        <option value="DRAFT">{tCourses("draft")}</option>
        <option value="PUBLISHED" disabled={!videoReady}>{tCourses("published")}</option>
      </Select>
      {!videoReady && <p className="-mt-2 text-xs text-muted">{t("publishNeedsVideo")}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="submit" disabled={save.pending}>{save.pending ? tc("saving") : tc("save")}</Button>
        <ConfirmButton
          trigger={<><Trash2 className="size-4" /> {t("deleteLesson")}</>} className="text-danger"
          title={t("deleteTitle")} text={t("deleteText")} confirmLabel={tc("delete")}
          onConfirm={() => del.run({ id: lesson.id })} pending={del.pending} error={del.error}
        />
      </div>
    </form>
  );
}

type Material = { id: string; title: string; type: "PDF" | "AUDIO"; sizeBytes: number };

export function MaterialsManager({ lessonId, materials }: { lessonId: string; materials: Material[] }) {
  const t = useTranslations("admin.lesson");
  const tc = useTranslations("common");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const del = useAction(deleteMaterialAction);

  function upload(file: File) {
    setError(null);
    if (file.size > MATERIAL_MAX_BYTES) return setError(t("materialTooLarge"));

    const body = new FormData();
    body.set("file", file);
    body.set("title", title);

    // fetch yuklash foizini bermaydi, shuning uchun XMLHttpRequest
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/lessons/${lessonId}/materials`);
    xhr.upload.onprogress = (e) => e.lengthComputable && setPercent(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => { setPercent(null); setError(t("materialFailed")); };
    xhr.onload = () => {
      setPercent(null);
      if (xhr.status === 201) {
        setTitle("");
        router.refresh();
      } else if (xhr.status === 413) setError(t("materialTooLarge"));
      else if (xhr.status === 415) setError(t("materialBadType"));
      else setError(t("materialFailed"));
    };
    setPercent(0);
    xhr.send(body);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("materialsHint")}</p>
      {(error || del.error) && <Alert>{error || del.error}</Alert>}

      {materials.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{t("materialsEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
              {m.type === "PDF" ? <FileText className="size-5 shrink-0 text-danger" /> : <Music className="size-5 shrink-0 text-brand" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.title}</p>
                <p className="text-xs text-muted">{m.type} · {formatBytes(m.sizeBytes)}</p>
              </div>
              <a href={`/api/materials/${m.id}`} aria-label={tc("open")} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-fg">
                <Download className="size-4" />
              </a>
              <ConfirmButton
                trigger={<Trash2 className="size-4" />} triggerVariant="ghost" className="size-9 px-0 text-danger"
                title={t("materialDeleteTitle")} confirmLabel={tc("delete")}
                onConfirm={() => del.run({ id: m.id })} pending={del.pending} error={del.error}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-xl border border-dashed border-line p-3">
        <input
          value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("materialTitle")} aria-label={t("materialTitle")} maxLength={140}
          className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
        <input
          ref={inputRef} type="file" accept={MATERIAL_ACCEPT} className="sr-only" tabIndex={-1}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }}
        />
        <Button type="button" variant="outline" disabled={percent !== null} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" /> {percent !== null ? t("materialUploading", { percent }) : t("materialUpload")}
        </Button>
      </div>
    </div>
  );
}
