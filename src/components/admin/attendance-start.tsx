"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QrCode } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useAction } from "@/hooks/use-action";
import { startAttendanceAction } from "@/server/actions/admin";

/** Guruhni tanlab davomatni boshlash — keyin QR kodli ekran ochiladi. */
export function AttendanceStart({ groups }: { groups: { id: string; name: string; members: number }[] }) {
  const t = useTranslations("admin.attendance");
  const router = useRouter();
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const start = useAction(startAttendanceAction, { refresh: false, onSuccess: ({ id }) => router.push(`/admin/davomat/${id}`) });

  return (
    <form
      className="relative overflow-hidden rounded-3xl bg-brand p-5 text-brand-fg shadow-xl shadow-brand/30 sm:p-6"
      onSubmit={(e) => { e.preventDefault(); start.run({ groupId: groupId || null }); }}
    >
      <div className="bg-dots pointer-events-none absolute right-5 top-5 h-16 w-28 text-white/20" aria-hidden />
      <div className="relative flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-brand"><QrCode className="size-7" /></span>
        <p className="max-w-xl pt-0.5 font-medium text-white/90">{t("startHint")}</p>
      </div>
      {start.error && <div className="relative mt-4"><Alert>{start.error}</Alert></div>}
      <div className="relative mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 text-fg [&_label]:text-white">
          <Select label={t("group")} value={groupId} onChange={(e) => setGroupId(e.target.value)} className="border-transparent">
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.members})</option>)}
            <option value="">{t("allStudents")}</option>
          </Select>
        </div>
        <Button type="submit" size="lg" disabled={start.pending} className="bg-white text-brand shadow-lg shadow-black/15 hover:bg-white/90">
          <QrCode className="size-5" /> {start.pending ? t("starting") : t("start")}
        </Button>
      </div>
    </form>
  );
}
