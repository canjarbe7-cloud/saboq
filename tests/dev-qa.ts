/**
 * Faqat lokal sinov uchun: vaqtinchalik "qa" foydalanuvchilarini va namunaviy ma'lumot yaratadi.
 *   npx tsx tests/dev-qa.ts up     — yaratish
 *   npx tsx tests/dev-qa.ts down   — o'chirish
 * Production bazasida ishlatmang.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";

const db = new PrismaClient();
const QA_PASSWORD = process.env.QA_PASSWORD ?? "";

async function up() {
  if (process.env.NODE_ENV === "production") throw new Error("Production'da ishlatib bo'lmaydi");
  if (QA_PASSWORD.length < 8) throw new Error("QA_PASSWORD muhit o'zgaruvchisini bering (kamida 8 belgi)");
  const passwordHash = await hashPassword(QA_PASSWORD);
  await db.user.upsert({
    where: { username: "qa.admin" }, update: { passwordHash },
    create: { username: "qa.admin", name: "QA Admin", phone: "+998900000001", role: "ADMIN", passwordHash, mustChangePassword: false },
  });
  const student = await db.user.upsert({
    where: { username: "qa.student" }, update: { passwordHash },
    create: { username: "qa.student", name: "Sinov O‘quvchi", phone: "+998901234567", role: "STUDENT", passwordHash, mustChangePassword: false },
  });
  if (!(await db.course.findUnique({ where: { slug: "qa-ielts-listening" } }))) {
    const course = await db.course.create({
      data: {
        title: "IELTS Listening: 6.5+", slug: "qa-ielts-listening", section: "LISTENING", status: "PUBLISHED",
        description: "Listening bo‘limining barcha savol turlari bo‘yicha strategiyalar.",
        modules: {
          create: [
            { title: "1-modul. Kirish", status: "PUBLISHED", position: 0, lessons: { create: [
              { title: "IELTS Listening formati", status: "PUBLISHED", position: 0, videoStatus: "READY", videoId: "qa-video-1", durationSec: 754, description: "Test tuzilishi, vaqt va baholash mezonlari." },
              { title: "Form completion savollari", status: "PUBLISHED", position: 1, videoStatus: "READY", videoId: "qa-video-2", durationSec: 1130 },
              { title: "Qoralama dars", status: "DRAFT", position: 2 },
            ] } },
            { title: "2-modul. Map va diagrammalar", status: "PUBLISHED", position: 1, lessons: { create: [
              { title: "Map labelling", status: "PUBLISHED", position: 0, videoStatus: "READY", videoId: "qa-video-3", durationSec: 905 },
            ] } },
          ],
        },
      },
    });
    await db.enrollment.create({ data: { userId: student.id, courseId: course.id, expiresAt: new Date(Date.now() + 90 * 86400_000) } });
    await db.course.create({ data: { title: "IELTS Writing Task 2", slug: "qa-ielts-writing", section: "WRITING", status: "PUBLISHED", position: 1 } });
  }
  if (!(await db.application.count())) {
    await db.application.create({ data: { name: "Dilnoza Karimova", phone: "+998931112233", level: "intermediate" } });
  }
  console.log("QA ma'lumotlari tayyor: qa.admin, qa.student");
}

async function down() {
  await db.course.deleteMany({ where: { slug: { startsWith: "qa-" } } });
  await db.user.deleteMany({ where: { username: { in: ["qa.admin", "qa.student"] } } });
  console.log("QA ma'lumotlari o'chirildi");
}

(process.argv[2] === "down" ? down() : up()).finally(() => db.$disconnect());
