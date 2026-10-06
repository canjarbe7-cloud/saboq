/** Dars materiallari uchun ruxsat etilgan fayl turlari va hajm chegarasi. */
export const MATERIAL_MAX_BYTES = 50 * 1024 * 1024;
export const MATERIAL_ACCEPT = ".pdf,.mp3,.m4a,.wav,.ogg";

export type DetectedFile = { type: "PDF" | "AUDIO"; ext: string; mime: string };

/**
 * Fayl turini kengaytmasiga emas, ichidagi dastlabki baytlarga ("magic bytes")
 * qarab aniqlaydi — nomi .pdf qilib o'zgartirilgan zararli faylni o'tkazmaydi.
 */
export function detectMaterial(head: Uint8Array): DetectedFile | null {
  const ascii = (from: number, len: number) => String.fromCharCode(...head.slice(from, from + len));
  if (ascii(0, 5) === "%PDF-") return { type: "PDF", ext: "pdf", mime: "application/pdf" };
  if (ascii(0, 3) === "ID3" || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0 && (head[1] & 0x06) !== 0)) {
    return { type: "AUDIO", ext: "mp3", mime: "audio/mpeg" };
  }
  if (ascii(4, 4) === "ftyp" && /^(M4A |M4B |mp42|isom)/.test(ascii(8, 4))) {
    return { type: "AUDIO", ext: "m4a", mime: "audio/mp4" };
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return { type: "AUDIO", ext: "wav", mime: "audio/wav" };
  if (ascii(0, 4) === "OggS") return { type: "AUDIO", ext: "ogg", mime: "audio/ogg" };
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
