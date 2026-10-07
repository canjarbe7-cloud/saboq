import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import { getPhoto, getSiteContent, savePhoto, saveSiteContent } from "@/server/services/site-content";
import { contactLinks, contentSchemas, contentUpdateSchema, defaultContent } from "@/lib/site-content";
import { resetDb } from "./helpers";

beforeEach(resetDb);

// Eng kichik haqiqiy PNG (1×1)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

describe("sayt kontenti", () => {
  it("hech narsa saqlanmagan bo'lsa boshlang'ich qiymatlar qaytadi", async () => {
    expect(await getSiteContent()).toEqual(defaultContent);
  });

  it("saqlangan bo'lim qaytadi, qolganlari boshlang'ich holda qoladi", async () => {
    const teachers = contentSchemas.teachers.parse([{ name: "Aziz Karimov", role: "Speaking", score: "IELTS 8.5", bio: "" }]);
    await saveSiteContent("teachers", teachers);
    const content = await getSiteContent();
    expect(content.teachers).toEqual([{ name: "Aziz Karimov", role: "Speaking", score: "IELTS 8.5", bio: "", photo: null }]);
    expect(content.faq).toEqual(defaultContent.faq);
  });

  it("bazadagi buzilgan yozuv saytni buzmaydi — boshlang'ich qiymat ishlatiladi", async () => {
    await db.siteContent.create({ data: { key: "stats", value: { nimadir: "noto'g'ri" } } });
    expect((await getSiteContent()).stats).toEqual(defaultContent.stats);
  });

  it("aloqa: telefon, username va koordinatalar tartibga keltiriladi", () => {
    const parsed = contentUpdateSchema.parse({
      key: "contacts",
      value: { phone: "91 155 62 55", telegram: "https://t.me/Saboq_school_official", instagram: "@saboq.school", address: "Buvayda", workingHours: "9–20", lat: "40,557149", lng: " 71.144170 " },
    });
    expect(parsed.value).toMatchObject({ phone: "+998911556255", telegram: "Saboq_school_official", instagram: "saboq.school", lat: 40.557149, lng: 71.14417 });

    const links = contactLinks(parsed.value as typeof defaultContent.contacts);
    expect(links.phone).toBe("+998 91 155 62 55");
    expect(links.telegramHref).toBe("https://t.me/Saboq_school_official");
    expect(links.googleMapsHref).toContain("query=40.557149,71.14417");
    // Yandex'da avval uzunlik, keyin kenglik
    expect(links.yandexMapsHref).toContain("pt=71.14417,40.557149");
  });

  it("noto'g'ri ma'lumot rad etiladi", () => {
    const contacts = { ...defaultContent.contacts };
    const bad = (value: object) => contentSchemas.contacts.safeParse({ ...contacts, ...value }).success;
    expect(bad({ phone: "12345" })).toBe(false);
    expect(bad({ lat: "" })).toBe(false);
    expect(bad({ lat: "95" })).toBe(false);
    expect(bad({ telegram: "a b" })).toBe(false);
    expect(bad({ instagram: "" })).toBe(true);
    expect(contentSchemas.teachers.safeParse([{ name: "", role: "", score: "", bio: "" }]).success).toBe(false);
    expect(contentSchemas.teachers.safeParse([{ name: "A", role: "", score: "", bio: "", photo: "../../etc/passwd" }]).success).toBe(false);
    expect(contentSchemas.stats.safeParse(Array(5).fill({ value: "1", label: "x" })).success).toBe(false);
  });

  it("rasm: faqat haqiqiy rasm qabul qilinadi; ro'yxatdan chiqqan rasm ombordan o'chadi", async () => {
    await expect(savePhoto(Buffer.from("<script>alert(1)</script>"))).rejects.toMatchObject({ code: "photoType" });
    expect(await getPhoto("../secret.png")).toBeNull();

    const name = await savePhoto(PNG);
    expect(name).toMatch(/^[a-f0-9]{24}\.png$/);
    expect((await getPhoto(name))?.mime).toBe("image/png");

    const teacher = { name: "Ustoz", role: "", score: "", bio: "" };
    await saveSiteContent("teachers", [{ ...teacher, photo: name }]);
    await saveSiteContent("teachers", [{ ...teacher, photo: null }]);
    expect(await storage.get(`site/${name}`)).toBeNull();
  });
});
