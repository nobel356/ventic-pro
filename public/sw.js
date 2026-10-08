const CACHE = "ventic-pro-v12e";
const CORE = [
  "/",
  "/order",
  "/customer",
  "/faq",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(CORE),
      )
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== CACHE,
            )
            .map((key) =>
              caches.delete(key),
            ),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET"
  ) {
    return;
  }

  const url = new URL(
    event.request.url,
  );

  if (
    url.origin !==
    self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy =
          response.clone();

        caches
          .open(CACHE)
          .then((cache) =>
            cache.put(
              event.request,
              copy,
            ),
          )
          .catch(() => undefined);

        return response;
      })
      .catch(async () => {
        const cached =
          await caches.match(
            event.request,
          );

        return (
          cached ||
          (await caches.match(
            "/offline",
          ))
        );
      }),
  );
});
