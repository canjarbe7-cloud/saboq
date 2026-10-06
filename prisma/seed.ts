/**
 * Birinchi admin akkauntini yaratadi:  npm run db:seed
 * Admin allaqachon mavjud bo'lsa, hech narsa o'zgarmaydi.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { generateTempPassword, hashPassword } from "../src/server/auth/password";
import { checkPassword } from "../src/lib/password-policy";

const db = new PrismaClient();

async function main() {
  const username = (process.env.SEED_ADMIN_USERNAME || "admin").trim().toLowerCase();
  const existing = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (existing) {
    console.log(`Admin allaqachon mavjud (login: ${existing.username}). Hech narsa o'zgartirilmadi.`);
    return;
  }

  const fromEnv = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (fromEnv && checkPassword(fromEnv, username).length) {
    throw new Error("SEED_ADMIN_PASSWORD juda zaif: kamida 8 belgi, harf va raqam bo'lsin.");
  }
  const password = fromEnv || generateTempPassword(14);

  await db.user.create({
    data: {
      username,
      name: process.env.SEED_ADMIN_NAME || "Administrator",
      phone: process.env.SEED_ADMIN_PHONE || "",
      role: "ADMIN",
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    },
  });

  console.log("\n✅ Admin akkaunti yaratildi");
  console.log(`   Login: ${username}`);
  if (fromEnv) console.log("   Parol: .env faylidagi SEED_ADMIN_PASSWORD");
  else console.log(`   Vaqtinchalik parol: ${password}   (faqat hozir ko'rsatiladi — yozib oling)`);
  console.log("   Birinchi kirishda parolni o'zgartirish so'raladi.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
