/* ふたごのリバーシ Service Worker
 * ゲームに必要なファイルをすべてキャッシュして、オフラインでも遊べるようにする。
 * index.html などを更新したときは CACHE_VERSION を上げること。
 */
const CACHE_VERSION = "futago-reversi-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

/* addAll は 1つでも 404 だと ぜんぶ 失敗して SW が入らない。
   （前の版で icons/ が無く、まさに これが おきていた）
   1ファイルずつ 入れて、こけても 残りは キャッシュする。 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.all(ASSETS.map((u) => cache.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// キャッシュ優先・裏でネットワーク更新(stale-while-revalidate)。
// オフラインでは即キャッシュから返り、オンラインなら次回起動時に最新版になる。
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      const refresh = fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
