/*
 * Streakin Service Worker
 * - Cache aset statis (app shell) untuk basic offline support.
 * - Menangani push notification (reminder check-in, perubahan leaderboard, shield terpakai).
 * - Network-first untuk halaman & API, cache-first untuk aset statis.
 *
 * Naikkan versi CACHE saat ada perubahan besar agar cache lama dibersihkan.
 */
const CACHE = "streakin-v1";
const APP_SHELL = ["/", "/offline", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Jangan cache request ke Supabase / auth — selalu online.
  if (url.origin !== self.location.origin) return;

  // Navigasi halaman: network-first, fallback ke cache lalu /offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/offline")))
    );
    return;
  }

  // Aset statis (icon, css, js): cache-first.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});

/* ------------------------- Push Notification ------------------------- */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Streakin", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Streakin";
  const options = {
    body: data.body || "Waktunya check-in biar streak-mu aman! 🔥",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || "streakin-reminder",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
