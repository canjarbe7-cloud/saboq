"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, CheckCircle2, ChevronRight, Eye, FileText, Pencil, Plus, Trash2, Video, VideoOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { SectionBadge, SectionIcon } from "@/components/ui/section-icon";
import { Field, Select, Textarea } from "@/components/ui/field";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { SortableList } from "./sortable-list";
import { useAction } from "@/hooks/use-action";
import { formatDuration } from "@/lib/file-types";
import { SECTIONS } from "@/lib/validation";
import {
  publishCourseTreeAction,
  createCourseAction, createLessonAction, createModuleAction, deleteCourseAction, deleteModuleAction,
  reorderAction, updateCourseAction, updateModuleAction,
} from "@/server/actions/admin";

type Status = "DRAFT" | "PUBLISHED";
type Section = (typeof SECTIONS)[number];

export function StatusBadge({ status }: { status: Status }) {
  const t = useTranslations("admin.courses");
  return <Badge tone={status === "PUBLISHED" ? "success" : "neutral"}>{status === "PUBLISHED" ? t("published") : t("draft")}</Badge>;
}

function SectionSelect({ value, onChange }: { value: Section; onChange: (s: Section) => void }) {
  const t = useTranslations();
  return (
    <Select label={t("admin.courses.section")} value={value} onChange={(e) => onChange(e.target.value as Section)}>
      {SECTIONS.map((s) => <option key={s} value={s}>{t(`sections.${s}`)}</option>)}
    </Select>
  );
}

/* ───────────── Kurslar ro'yxati ───────────── */

type CourseItem = { id: string; title: string; section: Section; status: Status; modules: number; lessons: number; students: number };

export function CourseList({ courses }: { courses: CourseItem[] }) {
  const t = useTranslations("admin.courses");
  const ts = useTranslations("sections");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", section: "LISTENING" as Section, description: "" });
  const create = useAction(createCourseAction, { refresh: false, onSuccess: ({ id }) => router.push(`/admin/kurslar/${id}`) });
  const reorder = useAction(reorderAction);

  const addButton = (
    <Button type="button" onClick={() => setOpen(true)}><Plus className="size-5" /> {t("add")}</Button>
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("title")}</h1>
        {courses.length > 0 && addButton}
      </div>
      {reorder.error && <div className="mb-3"><Alert>{reorder.error}</Alert></div>}

      {courses.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-7" />} title={t("empty")} text={t("emptyText")} action={addButton} />
      ) : (
        <SortableList
          items={courses}
          handleLabel={t("reorder")}
          className="space-y-2"
          onReorder={(ids) => reorder.run({ kind: "course", parentId: null, ids })}
          renderItem={(c, handle) => (
            <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-2 shadow-card sm:gap-2 sm:p-3">
              {handle}
              <Link href={`/admin/kurslar/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 hover:bg-surface-2">
                <SectionIcon section={c.section} className="hidden sm:grid" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-bold">{c.title}</span>
                    <SectionBadge section={c.section}>{ts(c.section)}</SectionBadge>
                    <StatusBadge status={c.status} />
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {t("modulesCount", { count: c.modules })} · {t("lessonsCount", { count: c.lessons })} · {t("studentsCount", { count: c.students })}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted" />
              </Link>
            </div>
          )}
        />
      )}

      <Modal open={open} onClose={() => { setOpen(false); create.clearError(); }} title={t("add")}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.run(form); }}>
          {create.error && <Alert>{create.error}</Alert>}
          <Field label={t("name")} required maxLength={140} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="IELTS Listening: 6.5+" />
          <SectionSelect value={form.section} onChange={(section) => setForm({ ...form, section })} />
          <Textarea label={t("description")} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
            <Button type="submit" disabled={create.pending}>{create.pending ? tc("saving") : tc("add")}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ───────────── Kurs sozlamalari ───────────── */

export function CourseSettings({ course }: { course: { id: string; title: string; section: Section; description: string; status: Status } }) {
  const t = useTranslations("admin.courses");
  const tc = useTranslations("common");
  const router = useRouter();
  const [form, setForm] = useState(course);
  const [saved, setSaved] = useState(false);
  const save = useAction(updateCourseAction, { onSuccess: () => setSaved(true) });
  const del = useAction(deleteCourseAction, { refresh: false, onSuccess: () => router.push("/admin/kurslar") });
  const set = (v: Partial<typeof form>) => { setSaved(false); setForm((f) => ({ ...f, ...v })); };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.run(form); }}>
      {save.error && <Alert>{save.error}</Alert>}
      {saved && !save.error && <Alert kind="success">{tc("saved")}</Alert>}
      <Field label={t("name")} required maxLength={140} value={form.title} onChange={(e) => set({ title: e.target.value })} />
      <SectionSelect value={form.section} onChange={(section) => set({ section })} />
      <Select label={t("status")} value={form.status} onChange={(e) => set({ status: e.target.value as Status })}>
        <option value="DRAFT">{t("draft")}</option>
        <option value="PUBLISHED">{t("published")}</option>
      </Select>
      <Textarea label={t("description")} maxLength={2000} value={form.description} onChange={(e) => set({ description: e.target.value })} />
      <p className="text-xs text-muted">{t("draftHint")}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="submit" disabled={save.pending}>{save.pending ? tc("saving") : tc("save")}</Button>
        <ConfirmButton
          trigger={<><Trash2 className="size-4" /> {tc("delete")}</>} className="text-danger"
          title={t("deleteCourseTitle")} text={t("deleteCourseText")} confirmLabel={tc("delete")}
          onConfirm={() => del.run({ id: course.id })} pending={del.pending} error={del.error}
        />
      </div>
    </form>
  );
}

/* ───────────── Modullar va darslar ───────────── */

type LessonItem = { id: string; title: string; status: Status; videoStatus: string; durationSec: number; materials: number };
type ModuleItem = { id: string; title: string; status: Status; lessons: LessonItem[] };

function InlineAdd({ placeholder, label, onAdd, pending }: { placeholder: string; label: string; onAdd: (title: string) => void; pending: boolean }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => { e.preventDefault(); if (title.trim().length >= 2) { onAdd(title.trim()); setTitle(""); } }}
    >
      <input
        value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} aria-label={placeholder} maxLength={140}
        className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
      <Button type="submit" variant="outline" size="sm" className="h-10" disabled={pending || title.trim().length < 2}>
        <Plus className="size-4" /> <span className="hidden sm:inline">{label}</span>
      </Button>
    </form>
  );
}

export function CourseStructure({ courseId, modules }: { courseId: string; modules: ModuleItem[] }) {
  const t = useTranslations("admin.courses");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState<{ id: string; title: string; status: Status } | null>(null);
  const reorder = useAction(reorderAction);
  const addModule = useAction(createModuleAction);
  const addLesson = useAction(createLessonAction);
  const saveModule = useAction(updateModuleAction, { onSuccess: () => setEditing(null) });
  const delModule = useAction(deleteModuleAction);
  const error = reorder.error || addModule.error || addLesson.error;

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}

      {modules.length === 0 ? (
        <EmptyState title={t("noModules")} text={t("noModulesText")} />
      ) : (
        <SortableList
          items={modules}
          handleLabel={t("reorder")}
          className="space-y-3"
          onReorder={(ids) => reorder.run({ kind: "module", parentId: courseId, ids })}
          renderItem={(m, handle) => (
            <div className="rounded-2xl border border-line bg-surface shadow-card">
              <div className="flex items-center gap-1 border-b border-line p-2 sm:gap-2 sm:px-3">
                {handle}
                <p className="min-w-0 flex-1 truncate font-bold">{m.title}</p>
                <StatusBadge status={m.status} />
                <button type="button" onClick={() => setEditing({ id: m.id, title: m.title, status: m.status })} aria-label={t("renameModule")}
                  className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
                  <Pencil className="size-4" />
                </button>
                <ConfirmButton
                  trigger={<Trash2 className="size-4" />} triggerVariant="ghost" className="size-9 px-0 text-danger"
                  title={t("deleteModuleTitle")} text={t("deleteModuleText")} confirmLabel={tc("delete")}
                  onConfirm={() => delModule.run({ id: m.id })} pending={delModule.pending} error={delModule.error}
                />
              </div>
              <div className="space-y-2 p-2 sm:p-3">
                {m.lessons.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-muted">{t("noLessons")}</p>
                ) : (
                  <SortableList
                    items={m.lessons}
                    handleLabel={t("reorder")}
                    className="space-y-1"
                    onReorder={(ids) => reorder.run({ kind: "lesson", parentId: m.id, ids })}
                    renderItem={(l, lessonHandle) => (
                      <div className="flex items-center gap-1 rounded-xl bg-surface-2">
                        {lessonHandle}
                        <Link href={`/admin/darslar/${l.id}`} className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-3 hover:underline">
                          {l.videoStatus === "READY" ? <Video className="size-4 shrink-0 text-success" /> : <VideoOff className="size-4 shrink-0 text-muted" />}
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{l.title}</span>
                          {l.materials > 0 && (
                            <span className="hidden items-center gap-1 text-xs text-muted sm:flex"><FileText className="size-3.5" />{l.materials}</span>
                          )}
                          {l.durationSec > 0 && <span className="text-xs tabular-nums text-muted">{formatDuration(l.durationSec)}</span>}
                          <StatusBadge status={l.status} />
                        </Link>
                      </div>
                    )}
                  />
                )}
                <InlineAdd placeholder={t("lessonName")} label={t("addLesson")} pending={addLesson.pending} onAdd={(title) => addLesson.run({ moduleId: m.id, title })} />
              </div>
            </div>
          )}
        />
      )}

      <div className="rounded-2xl border border-dashed border-line p-3">
        <InlineAdd placeholder={t("moduleName")} label={t("addModule")} pending={addModule.pending} onAdd={(title) => addModule.run({ courseId, title })} />
      </div>

      <Modal open={!!editing} onClose={() => { setEditing(null); saveModule.clearError(); }} title={t("renameModule")}>
        {editing && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveModule.run(editing); }}>
            {saveModule.error && <Alert>{saveModule.error}</Alert>}
            <Field label={t("moduleName")} required maxLength={140} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Select label={t("status")} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Status })}>
              <option value="DRAFT">{t("draft")}</option>
              <option value="PUBLISHED">{t("published")}</option>
            </Select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={saveModule.pending}>{saveModule.pending ? tc("saving") : tc("save")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

/** Kurs nega o'quvchilarga ko'rinmasligini ko'rsatadi va bir bosishda hammasini nashr qiladi. */
export function CourseVisibility({ courseId, issues, canPublish }: { courseId: string; issues: string[]; canPublish: boolean }) {
  const t = useTranslations("admin.courses");
  const [done, setDone] = useState<string | null>(null);
  const { run, pending, error } = useAction(publishCourseTreeAction, {
    onSuccess: (r) => setDone(r.skipped ? t("publishedSkipped", { count: r.skipped }) : t("publishedAll")),
  });

  if (issues.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm font-semibold text-success">
        <CheckCircle2 className="size-5 shrink-0" /> {done ?? t("visibleOk")}
      </p>
    );
  }
  return (
    <div className="space-y-3 rounded-xl bg-accent-soft p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-accent-fg dark:text-accent"><Eye className="size-5 shrink-0" /> {t("visibleProblems")}</p>
      <ul className="list-disc space-y-1 pl-6 text-sm">
        {issues.map((i) => <li key={i}>{i}</li>)}
      </ul>
      {error && <Alert>{error}</Alert>}
      {done && <Alert kind="success">{done}</Alert>}
      {canPublish && (
        <Button type="button" disabled={pending} onClick={() => run({ courseId })}>
          <CheckCircle2 className="size-5" /> {t("publishAll")}
        </Button>
      )}
    </div>
  );
}
