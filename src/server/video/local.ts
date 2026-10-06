import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, open, rename, rm, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Bunny Stream ulanmagan bo'lsa — videolar serverning ./storage/videos papkasida saqlanadi
 * va ruxsat tekshiriladigan /api/lessons/[id]/video yo'li orqali (Range bilan) beriladi.
 * Lokal ishlab chiqish va bitta VPS uchun mo'ljallangan; ko'p o'quvchili saytga Bunny tavsiya etiladi.
 */

const ROOT = path.resolve(process.cwd(), "storage", "videos");
export const LOCAL_VIDEO_MAX_BYTES = 2 * 1024 * 1024 * 1024;

const TYPES = { mp4: "video/mp4", webm: "video/webm" } as const;
type Ext = keyof typeof TYPES;

/** Lokal video identifikatori: "local-<hex>.<ext>" — fayl nomi foydalanuvchidan olinmaydi. */
const ID_RE = /^local-[a-f0-9]{24}\.(mp4|webm)$/;
export const isLocalVideoId = (videoId: string) => videoId.startsWith("local-");

function fileOf(videoId: string): string {
  if (!ID_RE.test(videoId)) throw new Error("Invalid local video id");
  return path.join(ROOT, videoId);
}

/** Fayl boshidagi "sehrli baytlar" bo'yicha formatni aniqlaydi (kengaytma yoki Content-Type'ga ishonilmaydi). */
function detect(head: Buffer): Ext | null {
  if (head.length >= 12 && head.subarray(4, 8).toString("latin1") === "ftyp") return "mp4"; // mp4, m4v, mov
  if (head.length >= 4 && head.readUInt32BE(0) === 0x1a45dfa3) return "webm";
  return null;
}

export class LocalVideoError extends Error {
  constructor(public code: "TOO_LARGE" | "BAD_TYPE" | "NO_FILE") {
    super(code);
  }
}

/** So'rov tanasini to'g'ridan-to'g'ri diskka yozadi (xotiraga butunlay yuklamasdan). */
export async function saveLocalVideo(body: ReadableStream<Uint8Array>): Promise<{ videoId: string; sizeBytes: number }> {
  await mkdir(ROOT, { recursive: true });
  const tmp = path.join(ROOT, `upload-${randomBytes(12).toString("hex")}.part`);
  let size = 0;
  try {
    await pipeline(
      Readable.fromWeb(body as import("node:stream/web").ReadableStream),
      async function* (source) {
        for await (const chunk of source) {
          size += chunk.length;
          if (size > LOCAL_VIDEO_MAX_BYTES) throw new LocalVideoError("TOO_LARGE");
          yield chunk;
        }
      },
      createWriteStream(tmp),
    );
    if (size === 0) throw new LocalVideoError("NO_FILE");

    const head = Buffer.alloc(16);
    const fh = await open(tmp, "r");
    await fh.read(head, 0, 16, 0).finally(() => fh.close());
    const ext = detect(head);
    if (!ext) throw new LocalVideoError("BAD_TYPE");

    const videoId = `local-${randomBytes(12).toString("hex")}.${ext}`;
    await rename(tmp, fileOf(videoId));
    return { videoId, sizeBytes: size };
  } catch (e) {
    await rm(tmp, { force: true });
    throw e;
  }
}

export async function deleteLocalVideo(videoId: string): Promise<void> {
  if (ID_RE.test(videoId)) await rm(fileOf(videoId), { force: true });
}

/** Videoni "Range" so'roviga mos qismlab beradi — brauzer o'rtasidan boshlab ko'rsata oladi. */
export async function streamLocalVideo(videoId: string, range: string | null): Promise<Response> {
  const file = fileOf(videoId);
  const info = await stat(file).catch(() => null);
  if (!info) return new Response(null, { status: 404 });
  const type = TYPES[videoId.split(".").pop() as Ext];
  const headers = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  const m = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (m[1] === "" && m[2] === "")) {
    const body = Readable.toWeb(createReadStream(file)) as ReadableStream;
    return new Response(body, { headers: { ...headers, "Content-Length": String(info.size) } });
  }
  // "bytes=-500" — oxirgi 500 bayt; "bytes=100-" — 100-baytdan oxirigacha
  let start = m[1] === "" ? Math.max(0, info.size - Number(m[2])) : Number(m[1]);
  let end = m[1] !== "" && m[2] !== "" ? Number(m[2]) : info.size - 1;
  end = Math.min(end, info.size - 1);
  if (start > end || start >= info.size) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
  }
  start = Math.max(0, start);
  const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
  return new Response(body, {
    status: 206,
    headers: { ...headers, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${info.size}` },
  });
}
