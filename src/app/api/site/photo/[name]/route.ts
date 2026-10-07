import { ApiError, apiHandler } from "@/server/auth/guards";
import { getPhoto } from "@/server/services/site-content";

/**
 * Ustoz rasmi — ochiq (bosh sahifada hammaga ko'rinadi). Fayl nomi tasodifiy va o'zgarmas,
 * shuning uchun brauzer uni uzoq muddat keshlaydi; rasm almashsa, nomi ham almashadi.
 */
export const GET = apiHandler(async (_request: Request, ctx: RouteContext<"/api/site/photo/[name]">) => {
  const photo = await getPhoto((await ctx.params).name);
  if (!photo) throw new ApiError(404, "NOT_FOUND");
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Content-Length": String(photo.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
