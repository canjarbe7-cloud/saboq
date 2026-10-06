import { z } from "zod";
import { ApiError, apiHandler, requireApiUser } from "@/server/auth/guards";
import { getLessonAccess, saveLessonPosition } from "@/server/services/learning";

const schema = z.object({ positionSec: z.number().int().min(0).max(24 * 60 * 60) });

/** Video to'xtagan joyni saqlash (pleyer har 15 soniyada va sahifa yopilganda yuboradi). */
export const POST = apiHandler(async (request: Request, ctx: RouteContext<"/api/lessons/[id]/progress">) => {
  const { user } = await requireApiUser(request, "STUDENT");
  const { id } = await ctx.params;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, "INVALID");

  const { access } = await getLessonAccess(user, id);
  if (access !== "ok") throw new ApiError(403, "FORBIDDEN");

  await saveLessonPosition(user.id, id, parsed.data.positionSec);
  return new Response(null, { status: 204 });
});
