import { ApiError, apiHandler, requireApiUser } from "@/server/auth/guards";
import { getLessonAccess } from "@/server/services/learning";
import { isLocalVideoId, streamLocalVideo } from "@/server/video/local";

/** Serverda saqlangan videoni beradi. Har so'rovda sessiya va kursga kirish huquqi tekshiriladi. */
export const GET = apiHandler(async (request: Request, ctx: RouteContext<"/api/lessons/[id]/video">) => {
  const { user } = await requireApiUser(request);
  const { id } = await ctx.params;
  const { access, lesson } = await getLessonAccess(user, id);
  if (access !== "ok" || !lesson) throw new ApiError(403, access === "expired" ? "EXPIRED" : "FORBIDDEN");
  if (!lesson.videoId || lesson.videoStatus !== "READY" || !isLocalVideoId(lesson.videoId)) throw new ApiError(404, "NO_VIDEO");
  return streamLocalVideo(lesson.videoId, request.headers.get("range"));
});
