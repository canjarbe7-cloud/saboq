import { db } from "@/server/db";
import { ApiError, apiHandler, requireApiUser } from "@/server/auth/guards";
import { getRequestMeta } from "@/server/request";
import { logAudit } from "@/server/services/audit";
import { deleteVideo, isVideoConfigured } from "@/server/video/bunny";
import { LOCAL_VIDEO_MAX_BYTES, LocalVideoError, saveLocalVideo } from "@/server/video/local";

/**
 * Darsga video yuklash — Bunny Stream ulanmagan holat uchun (video serverda saqlanadi).
 * Tana: videoning o'zi (multipart emas). "X-Duration" — brauzer aniqlagan davomiylik (soniya).
 */
export const POST = apiHandler(async (request: Request, ctx: RouteContext<"/api/admin/lessons/[id]/video">) => {
  const { user } = await requireApiUser(request, "ADMIN");
  if (isVideoConfigured()) throw new ApiError(409, "USE_BUNNY");
  const { id: lessonId } = await ctx.params;

  if (Number(request.headers.get("content-length") ?? 0) > LOCAL_VIDEO_MAX_BYTES) throw new ApiError(413, "TOO_LARGE");
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { id: true, title: true, videoId: true } });
  if (!lesson) throw new ApiError(404, "NOT_FOUND");
  if (!request.body) throw new ApiError(400, "NO_FILE");

  let saved;
  try {
    saved = await saveLocalVideo(request.body);
  } catch (e) {
    if (e instanceof LocalVideoError) throw new ApiError(e.code === "TOO_LARGE" ? 413 : e.code === "BAD_TYPE" ? 415 : 400, e.code);
    throw e;
  }

  const duration = Math.round(Number(request.headers.get("x-duration")) || 0);
  await db.lesson.update({
    where: { id: lessonId },
    data: { videoId: saved.videoId, videoStatus: "READY", durationSec: Math.min(Math.max(duration, 0), 24 * 3600) },
  });
  if (lesson.videoId) await deleteVideo(lesson.videoId);
  await logAudit({ actorId: user.id, action: "lesson.videoUpload", target: lessonId, details: { title: lesson.title }, ip: (await getRequestMeta()).ip });

  return Response.json({ ok: true }, { status: 201 });
});
