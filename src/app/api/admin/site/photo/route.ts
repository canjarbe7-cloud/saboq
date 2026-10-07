import { ApiError, apiHandler, requireApiUser } from "@/server/auth/guards";
import { AppError } from "@/server/errors";
import { savePhoto } from "@/server/services/site-content";
import { PHOTO_MAX_BYTES } from "@/lib/site-content";

/** Ustoz rasmini yuklash — faqat admin. Rasm brauzerda kichraytirilib yuboriladi (kvadrat, ~480px). */
export const POST = apiHandler(async (request: Request) => {
  await requireApiUser(request, "ADMIN");

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > PHOTO_MAX_BYTES + 64 * 1024) throw new ApiError(413, "TOO_LARGE");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) throw new ApiError(400, "NO_FILE");
  if (file.size > PHOTO_MAX_BYTES) throw new ApiError(413, "TOO_LARGE");

  try {
    return Response.json({ name: await savePhoto(Buffer.from(await file.arrayBuffer())) });
  } catch (e) {
    if (e instanceof AppError) throw new ApiError(415, "BAD_TYPE");
    throw e;
  }
});
