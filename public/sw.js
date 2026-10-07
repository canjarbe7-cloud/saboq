/*
 * Saboq — service worker. Vazifasi bitta: internet yo'q paytda ilova oq ekran o'rniga
 * "Internet yo'q" sahifasini ko'rsatadi. Sahifalar, darslar va API javoblari KESHLANMAYDI —
 * ular har doim serverdan olinadi (yopiq kontent qurilmada saqlanib qolmasin).
 */
const CACHE = "saboq-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Faqat sahifa ochish so'rovlari; qolgan hammasi (JS, video, API) brauzerning o'ziga qoldiriladi
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((r) => r ?? Response.error())));
});
