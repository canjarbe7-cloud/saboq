import { db } from "@/server/db";
import { ApiError, apiHandler, requireApiUser } from "@/server/auth/guards";
import { getLessonAccess } from "@/server/services/learning";
import { storage } from "@/server/storage";

const MIME: Record<string, string> = {
  pdf: "application/pdf", mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg",
};

/** Materialni yuklab olish — faqat shu darsga kirish huquqi bor foydalanuvchi uchun. */
export const GET = apiHandler(async (request: Request, ctx: RouteContext<"/api/materials/[id]">) => {
  const { user } = await requireApiUser(request);
  const { id } = await ctx.params;

  const material = await db.material.findUnique({ where: { id } });
  if (!material) throw new ApiError(404, "NOT_FOUND");

  const { access } = await getLessonAccess(user, material.lessonId);
  if (access !== "ok") throw new ApiError(403, "FORBIDDEN");

  const data = await storage.get(material.storageKey);
  if (!data) throw new ApiError(404, "NOT_FOUND");

  const ext = material.storageKey.split(".").pop() ?? "";
  // ?inline=1 — audio sahifadagi pleyerda tinglanadi (yuklab olinmaydi)
  const inline = material.type === "AUDIO" && new URL(request.url).searchParams.get("inline") === "1";
  const headers: Record<string, string> = {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Accept-Ranges": "bytes",
    // Nom UTF-8 da uzatiladi
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(material.fileName)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  // Audio pleyerda oldinga/orqaga surish uchun "Range" so'rovi
  const m = request.headers.get("range")?.match(/^bytes=(\d+)-(\d*)$/);
  if (m) {
    const start = Number(m[1]);
    const end = Math.min(m[2] ? Number(m[2]) : data.length - 1, data.length - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${data.length}` } });
    return new Response(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${data.length}` },
    });
  }
  return new Response(new Uint8Array(data), { headers: { ...headers, "Content-Length": String(data.length) } });
});
