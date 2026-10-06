"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { useAction } from "@/hooks/use-action";
import { deleteGroupAction, saveGroupAction } from "@/server/actions/admin";

type Group = { id: string; name: string; note: string | null; members: number };

export function GroupManager({ groups }: { groups: Group[] }) {
  const t = useTranslations("admin.groups");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState<{ id?: string; name: string; note: string } | null>(null);
  const save = useAction(saveGroupAction, { onSuccess: () => setEditing(null) });
  const del = useAction(deleteGroupAction);

  const addButton = (
    <Button type="button" onClick={() => setEditing({ name: "", note: "" })}>
      <Plus className="size-5" /> {t("add")}
    </Button>
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("title")}</h1>
        {groups.length > 0 && addButton}
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={<UsersRound className="size-7" />} title={t("empty")} text={t("emptyText")} action={addButton} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{g.name}</p>
                  {g.note && <p className="mt-0.5 text-sm text-muted">{g.note}</p>}
                </div>
                <Badge tone="brand">{t("members", { count: g.members })}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/admin/oquvchilar?group=${g.id}`} className="mr-auto text-sm font-semibold text-brand hover:underline">
                  {t("view")} →
                </Link>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ id: g.id, name: g.name, note: g.note ?? "" })}>
                  <Pencil className="size-4" /> {tc("edit")}
                </Button>
                <ConfirmButton
                  trigger={<Trash2 className="size-4" />} className="text-danger"
                  title={t("deleteTitle")} text={t("deleteText")} confirmLabel={tc("delete")}
                  onConfirm={() => del.run({ id: g.id })} pending={del.pending} error={del.error}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => { setEditing(null); save.clearError(); }} title={editing?.id ? t("editTitle") : t("add")}>
        {editing && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.run(editing); }}>
            {save.error && <Alert>{save.error}</Alert>}
            <Field label={t("name")} required maxLength={60} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Textarea label={t("note")} maxLength={300} className="min-h-20" value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={save.pending}>{save.pending ? tc("saving") : tc("save")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
