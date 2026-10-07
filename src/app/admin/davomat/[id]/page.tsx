import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AttendanceBoard } from "@/components/admin/attendance-board";
import { requireAdmin } from "@/server/auth/guards";
import { getSessionView } from "@/server/services/attendance";

export const metadata: Metadata = { title: "Davomat" };

export default async function AttendanceSessionPage({ params }: PageProps<"/admin/davomat/[id]">) {
  await requireAdmin();
  const view = await getSessionView((await params).id);
  if (!view) notFound();
  return <AttendanceBoard initial={view} />;
}
