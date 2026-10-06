import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import type { Role, UserStatus } from "@prisma/client";

export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

let counter = 0;
export async function makeUser(
  opts: { username?: string; password?: string; role?: Role; status?: UserStatus; mustChangePassword?: boolean } = {},
) {
  counter++;
  const password = opts.password ?? "Parol12345";
  const user = await db.user.create({
    data: {
      username: opts.username ?? `user${counter}`,
      name: `Test User ${counter}`,
      phone: `+99890000${String(counter).padStart(4, "0")}`,
      passwordHash: await hashPassword(password),
      role: opts.role ?? "STUDENT",
      status: opts.status ?? "ACTIVE",
      mustChangePassword: opts.mustChangePassword ?? false,
    },
  });
  return { user, password };
}

export const meta = (n = 1) => ({ ip: `10.0.0.${n}`, userAgent: `device-${n}` });
