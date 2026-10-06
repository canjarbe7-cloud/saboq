import { PrismaClient } from "@prisma/client";

// Dev rejimida "hot reload" har safar yangi ulanish ochmasligi uchun
// bitta PrismaClient global o'zgaruvchida saqlanadi.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
