import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { checkIn, closeSession, currentCode, getSessionView, getStudentAttendance, ROTATE_MS, setManual, startSession } from "@/server/services/attendance";
import { makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

async function setup() {
  const group = await db.group.create({ data: { name: "IELTS 6.5" } });
  const other = await db.group.create({ data: { name: "Boshqa guruh" } });
  const [a, b, outsider] = await Promise.all([makeUser(), makeUser(), makeUser()]);
  await db.user.updateMany({ where: { id: { in: [a.user.id, b.user.id] } }, data: { groupId: group.id } });
  await db.user.update({ where: { id: outsider.user.id }, data: { groupId: other.id } });
  const { id } = await startSession(group.id);
  const session = await db.attendanceSession.findUniqueOrThrow({ where: { id } });
  return { group, session, a: a.user, b: b.user, outsider: outsider.user };
}

const codeOf = async (expect: { rejects: { toMatchObject: (o: object) => Promise<void> } }, code: string) => expect.rejects.toMatchObject({ code });

describe("davomat (QR)", () => {
  it("to'g'ri kod bilan o'quvchi 'Bor' bo'ladi; qayta skaner xato emas", async () => {
    const { session, a } = await setup();
    const { code } = currentCode(session);

    const first = await checkIn(a.id, code);
    expect(first).toMatchObject({ title: "IELTS 6.5", already: false });
    expect((await checkIn(a.id, code)).already).toBe(true);

    const view = await getSessionView(session.id);
    expect(view?.roster.map((r) => r.status)).toEqual(["PRESENT", null]);
    expect(view).not.toHaveProperty("secret");
  });

  it("eskirgan, soxta va kelajakdagi kod rad etiladi", async () => {
    const { session, a } = await setup();
    const now = Date.now();
    const old = currentCode(session, now - 5 * ROTATE_MS).code;
    await codeOf(expect(checkIn(a.id, old, now)), "attendanceExpired");
    // Biroz eskirgan kod (skaner qilib, sahifa ochilguncha) qabul qilinadi
    expect((await checkIn(a.id, currentCode(session, now - 2 * ROTATE_MS).code, now)).already).toBe(false);

    const [id, slot] = currentCode(session, now).code.split(".");
    await codeOf(expect(checkIn(a.id, `${id}.${slot}.AAAAAAAAAAAAAAAAAAAAAA`, now)), "attendanceInvalid");
    await codeOf(expect(checkIn(a.id, "nimadir", now)), "attendanceInvalid");
    // Imzo aynan shu oraliqqa tegishli: boshqa oraliq raqami bilan ishlamaydi
    const sig = currentCode(session, now).code.split(".")[2];
    await codeOf(expect(checkIn(a.id, `${id}.${Number(slot) - 1}.${sig}`, now)), "attendanceInvalid");
  });

  it("boshqa guruh o'quvchisi belgilana olmaydi", async () => {
    const { session, outsider } = await setup();
    await codeOf(expect(checkIn(outsider.id, currentCode(session).code)), "attendanceNotMember");
    expect(await db.attendanceRecord.count()).toBe(0);
  });

  it("yakunlanganda skaner qilmaganlar 'Yo'q' bo'ladi va kod ishlamay qoladi", async () => {
    const { session, a, b } = await setup();
    await checkIn(a.id, currentCode(session).code);
    await closeSession(session.id);

    await codeOf(expect(checkIn(b.id, currentCode(session).code)), "attendanceClosed");
    const view = await getSessionView(session.id);
    expect(view?.closed).toBe(true);
    expect(Object.fromEntries(view!.roster.map((r) => [r.userId, r.status]))).toEqual({ [a.id]: "PRESENT", [b.id]: "ABSENT" });

    // Admin keyin qo'lda tuzatishi mumkin
    await setManual(session.id, b.id, "PRESENT");
    expect(await getStudentAttendance(b.id)).toMatchObject({ present: 1, absent: 0 });
    expect(await getStudentAttendance(a.id)).toMatchObject({ present: 1, absent: 0 });
  });

  it("guruhsiz davomatga har qanday faol o'quvchi belgilana oladi", async () => {
    const { outsider } = await setup();
    const { id } = await startSession(null);
    const session = await db.attendanceSession.findUniqueOrThrow({ where: { id } });
    expect((await checkIn(outsider.id, currentCode(session).code)).already).toBe(false);
  });
});
