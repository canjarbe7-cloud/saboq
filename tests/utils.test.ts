import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";
import { addMonths } from "@/lib/format";

describe("login'dan keyin qaytish manzili (safeRedirect)", () => {
  it("o'z bo'limi ichidagi ichki manzilga ruxsat beradi", () => {
    expect(safeRedirect("/kabinet/darslar/abc123", "/kabinet")).toBe("/kabinet/darslar/abc123");
    expect(safeRedirect("/kabinet", "/kabinet")).toBe("/kabinet");
    expect(safeRedirect("/kabinet?tab=activity", "/kabinet")).toBe("/kabinet?tab=activity");
    expect(safeRedirect("/admin/oquvchilar?page=2", "/admin")).toBe("/admin/oquvchilar?page=2");
  });

  it("boshqa saytga yoki boshqa bo'limga yo'naltirmaydi", () => {
    for (const bad of [
      "https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil.com", "/kabinetx", "/kabinet-evil",
      "/admin", "javascript:alert(1)", "/kabinet/\nSet-Cookie:x", "", null, undefined, 42, ["/kabinet"],
    ]) {
      expect(safeRedirect(bad, "/kabinet")).toBeNull();
    }
    // O'quvchi admin sahifasiga, admin esa kabinetga yo'naltirilmaydi
    expect(safeRedirect("/kabinet", "/admin")).toBeNull();
  });
});

describe("oy qo'shish (addMonths)", () => {
  it("oy oxirini to'g'ri hisoblaydi", () => {
    expect(addMonths(new Date(2026, 0, 31), 1).getDate()).toBe(28); // 31-yanvar → 28-fevral
    expect(addMonths(new Date(2026, 0, 31), 1).getMonth()).toBe(1);
    expect(addMonths(new Date(2028, 0, 31), 1).getDate()).toBe(29); // kabisa yili
    expect(addMonths(new Date(2026, 7, 31), 1).getDate()).toBe(30); // 31-avgust → 30-sentabr
  });

  it("yil chegarasidan to'g'ri o'tadi", () => {
    const d = addMonths(new Date(2026, 10, 15), 3); // 15-noyabr + 3 oy
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2027, 1, 15]);
    const y = addMonths(new Date(2026, 9, 5), 12);
    expect([y.getFullYear(), y.getMonth(), y.getDate()]).toEqual([2027, 9, 5]);
  });
});

describe("lokal fayl ombori", () => {
  it("oxirgi fayl o'chirilganda bo'sh papka ham o'chadi", async () => {
    const { storage } = await import("@/server/storage");
    const { existsSync } = await import("node:fs");
    const path = await import("node:path");
    const dir = `materials/vitest-${Date.now()}`;
    await storage.put(`${dir}/a.pdf`, Buffer.from("%PDF-1.4"), "application/pdf");
    await storage.put(`${dir}/b.pdf`, Buffer.from("%PDF-1.4"), "application/pdf");
    const abs = path.resolve(process.cwd(), "storage", dir);
    await storage.delete(`${dir}/a.pdf`);
    expect(existsSync(abs)).toBe(true); // boshqa fayl bor — papka qoladi
    await storage.delete(`${dir}/b.pdf`);
    expect(existsSync(abs)).toBe(false);
  });
});
