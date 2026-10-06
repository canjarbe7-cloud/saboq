import type { Metadata } from "next";
import { GroupManager } from "@/components/admin/group-manager";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Guruhlar" };

export default async function GroupsPage() {
  await requireAdmin();
  const groups = await db.group.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, note: true, _count: { select: { users: true } } },
  });
  return <GroupManager groups={groups.map((g) => ({ id: g.id, name: g.name, note: g.note, members: g._count.users }))} />;
}
