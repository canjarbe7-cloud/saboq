import { execSync } from "node:child_process";

/** Test bazasiga migratsiyalarni qo'llaydi. */
export default function setup() {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error("Testlar faqat nomida 'test' bor bazada ishlaydi (.env.test ni tekshiring).");
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
