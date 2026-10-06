import { createHash } from "node:crypto";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { deleteLocalVideo, isLocalVideoId } from "./local";

/**
 * Bunny Stream bilan ishlash. Videolar o'z serverimizda saqlanmaydi:
 *  - yuklash: brauzer → Bunny (TUS, uzilsa davom etadi), server faqat imzo beradi;
 *  - ko'rish: server qisqa muddatli imzolangan HLS havola beradi.
 * Boshqa xizmatga (Mux, Cloudflare Stream) o'tish uchun faqat shu faylni almashtirish kifoya.
 */

const API = "https://video.bunnycdn.com";
export const TUS_ENDPOINT = `${API}/tusupload`;

export function isVideoConfigured(): boolean {
  return Boolean(env.BUNNY_STREAM_LIBRARY_ID && env.BUNNY_STREAM_API_KEY && env.BUNNY_STREAM_CDN_HOST && env.BUNNY_STREAM_TOKEN_KEY);
}

function assertConfigured() {
  if (!isVideoConfigured()) throw new AppError("videoNotConfigured");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  assertConfigured();
  const res = await fetch(`${API}/library/${env.BUNNY_STREAM_LIBRARY_ID}${path}`, {
    ...init,
    headers: { AccessKey: env.BUNNY_STREAM_API_KEY!, "Content-Type": "application/json", Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    console.error("[bunny]", res.status, await res.text().catch(() => ""));
    throw new AppError("videoService");
  }
  return res.json() as Promise<T>;
}

export async function createVideo(title: string): Promise<string> {
  const data = await api<{ guid: string }>("/videos", { method: "POST", body: JSON.stringify({ title }) });
  return data.guid;
}

/** Brauzer Bunny'ga to'g'ridan-to'g'ri yuklashi uchun 24 soatlik imzo (API kaliti brauzerga berilmaydi). */
export function signTusUpload(videoId: string) {
  assertConfigured();
  const expire = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const signature = createHash("sha256")
    .update(`${env.BUNNY_STREAM_LIBRARY_ID}${env.BUNNY_STREAM_API_KEY}${expire}${videoId}`)
    .digest("hex");
  return { endpoint: TUS_ENDPOINT, signature, expire, videoId, libraryId: env.BUNNY_STREAM_LIBRARY_ID! };
}

export type RemoteVideoState = { state: "PROCESSING" | "READY" | "FAILED" | "UPLOADING"; durationSec: number };

export async function getVideoState(videoId: string): Promise<RemoteVideoState> {
  // Bunny holatlari: 0 yaratildi, 1 yuklandi, 2 qayta ishlanmoqda, 3 kodlanmoqda, 4 tayyor, 5 xato, 6 yuklash xatosi
  const v = await api<{ status: number; length: number }>(`/videos/${videoId}`);
  const state = v.status === 4 ? "READY" : v.status >= 5 ? "FAILED" : v.status === 0 ? "UPLOADING" : "PROCESSING";
  return { state, durationSec: Math.round(v.length || 0) };
}

export async function deleteVideo(videoId: string): Promise<void> {
  if (isLocalVideoId(videoId)) return deleteLocalVideo(videoId);
  if (!isVideoConfigured()) return;
  await api(`/videos/${videoId}`, { method: "DELETE" }).catch(() => undefined);
}

/**
 * Qisqa muddatli imzolangan HLS havola (Bunny "CDN Token Authentication").
 * token_path butun video papkasini qamraydi — pleylist ichidagi bo'laklar ham shu token bilan ochiladi.
 */
export function signedPlaylistUrl(videoId: string, ttlSec = 4 * 60 * 60): { url: string; expiresAt: number } {
  assertConfigured();
  const expires = Math.floor(Date.now() / 1000) + ttlSec;
  const tokenPath = `/${videoId}/`;
  const token = createHash("sha256")
    .update(`${env.BUNNY_STREAM_TOKEN_KEY}${tokenPath}${expires}token_path=${tokenPath}`)
    .digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const url =
    `https://${env.BUNNY_STREAM_CDN_HOST}/bcdn_token=${token}&expires=${expires}` +
    `&token_path=${encodeURIComponent(tokenPath)}/${videoId}/playlist.m3u8`;
  return { url, expiresAt: expires };
}
