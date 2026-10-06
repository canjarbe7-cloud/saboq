import { hash, verify } from "@node-rs/argon2";
import { randomInt } from "node:crypto";

// argon2id — OWASP tavsiya qilgan minimal parametrlar.
const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;
/**
 * Login topilmaganda ham parol tekshiruvi vaqtini sarflaymiz —
 * javob vaqtidan login mavjudligini bilib bo'lmasin.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(await dummyHash, password);
}

// O'qishda adashtiradigan belgilar (0/O, 1/l/I) olib tashlangan.
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

/** Admin o'quvchiga beradigan vaqtinchalik parol (10 belgi). */
export function generateTempPassword(length = 10): string {
  const all = LOWER + UPPER + DIGITS;
  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(all));
  // Fisher–Yates aralashtirish
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
