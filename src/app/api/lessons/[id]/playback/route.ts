import { ApiError, apiHandler, requireApiUser } from "@/server/auth/guards";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { getLessonAccess } from "@/server/services/learning";
import { isVideoConfigured, signedPlaylistUrl } from "@/server/video/bunny";
import { isLocalVideoId } from "@/server/video/local";

/**
 * Video uchun qisqa muddatli imzolangan havola beradi.
 * Har safar: sessiya + kursga kirish huquqi + muddat tekshiriladi.
 */
export const GET = apiHandler(async (request: Request, ctx: RouteContext<"/api/lessons/[id]/playback">) => {
  const { user } = await requireApiUser(request);
  const { id } = await ctx.params;

  // Bitta foydalanuvchi daqiqasiga 30 tadan ortiq havola so'ray olmaydi
  if (!(await consumeRateLimit(`playback:${user.id}`, 30, 60))) throw new ApiError(429, "RATE_LIMITED");

  const { access, lesson } = await getLessonAccess(user, id);
  if (access !== "ok" || !lesson) throw new ApiError(403, access === "expired" ? "EXPIRED" : "FORBIDDEN");
  if (!lesson.videoId || lesson.videoStatus !== "READY") throw new ApiError(404, "NO_VIDEO");
  // Serverda saqlangan video — oddiy fayl sifatida, ruxsat tekshiriladigan yo'l orqali
  if (isLocalVideoId(lesson.videoId)) {
    return Response.json({ url: `/api/lessons/${id}/video`, kind: "file" }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!isVideoConfigured()) throw new ApiError(503, "VIDEO_NOT_CONFIGURED");

  const signed = signedPlaylistUrl(lesson.videoId);
  return Response.json(signed, { headers: { "Cache-Control": "no-store" } });
});
