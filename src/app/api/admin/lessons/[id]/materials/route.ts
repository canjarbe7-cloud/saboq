import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { ApiError, apiHandler, requireApiUser } from "@/server/auth/guards";
import { getRequestMeta } from "@/server/request";
import { logAudit } from "@/server/services/audit";
import { storage } from "@/server/storage";
import { detectMaterial, MATERIAL_MAX_BYTES } from "@/lib/file-types";

/** Darsga material (PDF yoki audio) yuklash — faqat admin. */
export const POST = apiHandler(async (request: Request, ctx: RouteContext<"/api/admin/lessons/[id]/materials">) => {
  const { user } = await requireApiUser(request, "ADMIN");
  const { id: lessonId } = await ctx.params;

  // Katta so'rovni o'qishdan oldin sarlavha bo'yicha rad etamiz
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MATERIAL_MAX_BYTES + 1024 * 1024) throw new ApiError(413, "TOO_LARGE");

  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) throw new ApiError(404, "NOT_FOUND");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) throw new ApiError(400, "NO_FILE");
  if (file.size > MATERIAL_MAX_BYTES) throw new ApiError(413, "TOO_LARGE");

  const data = Buffer.from(await file.arrayBuffer());
  const detected = detectMaterial(data.subarray(0, 16));
  if (!detected) throw new ApiError(415, "BAD_TYPE");

  const rawTitle = String(form?.get("title") ?? "").trim() || file.name.replace(/\.[^.]+$/, "");
  const title = rawTitle.slice(0, 140);
  // Fayl nomi foydalanuvchidan olinmaydi — tasodifiy kalit ishlatiladi
  const storageKey = `materials/${lessonId}/${randomBytes(12).toString("hex")}.${detected.ext}`;
  await storage.put(storageKey, data, detected.mime);

  const material = await db.material.create({
    data: {
      lessonId,
      title,
      type: detected.type,
      storageKey,
      fileName: `${title.replace(/[^\p{L}\p{N} ._-]/gu, "").trim() || "material"}.${detected.ext}`,
      sizeBytes: file.size,
      position: await db.material.count({ where: { lessonId } }),
    },
  });
  await logAudit({ actorId: user.id, action: "material.upload", target: lessonId, details: { title }, ip: (await getRequestMeta()).ip });

  return Response.json({ id: material.id }, { status: 201 });
});
