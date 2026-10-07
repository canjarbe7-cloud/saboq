import { ApiError, apiHandler, requireApiUser } from "@/server/auth/guards";
import { env, isProd } from "@/server/env";
import { getQr, getSessionView } from "@/server/services/attendance";

/**
 * Davomat ekrani har bir necha soniyada shu yerdan so'raydi: yangi QR kod va kim kelgani.
 * QR ichidagi havola saytning tashqi manzili bilan tuziladi (dev rejimida — so'rov kelgan manzil,
 * shunda telefon tarmoq IP'si orqali ochilganda ham ishlaydi).
 */
export const GET = apiHandler(async (request: Request, ctx: RouteContext<"/api/admin/attendance/[id]">) => {
  await requireApiUser(request, "ADMIN");
  const { id } = await ctx.params;

  const view = await getSessionView(id);
  if (!view) throw new ApiError(404, "NOT_FOUND");

  const host = request.headers.get("host");
  const origin = isProd || !host ? env.APP_URL.replace(/\/$/, "") : `${new URL(request.url).protocol}//${host}`;
  const code = view.open ? await getQr(id, origin) : null;

  return Response.json({ ...view, qr: code?.qr ?? null, msLeft: code?.msLeft ?? 0 }, { headers: { "Cache-Control": "no-store" } });
});
