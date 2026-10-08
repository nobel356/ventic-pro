const CACHE = "ventic-pro-v12k-public-v1";

const PUBLIC_PAGES = new Set([
  "/",
  "/faq",
  "/offline",
  "/services/bathroom-ventilation",
  "/services/kitchen-ventilation",
  "/services/hood-exhaust",
]);

const STATIC_FILES = new Set([
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
]);

const PRIVATE_PREFIXES = [
  "/api/",
  "/admin",
  "/technician",
  "/customer/account",
  "/customer/review",
  "/customer/login",
  "/customer/register",
  "/customer/forgot",
  "/customer/reset",
];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(
        prefix.endsWith("/")
          ? prefix
          : `${prefix}/`,
      ),
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith(
      "/_next/static/",
    ) ||
    STATIC_FILES.has(
      url.pathname,
    )
  );
}

function isPublicNavigation(url) {
  return PUBLIC_PAGES.has(
    url.pathname,
  );
}

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) =>
          cache.addAll([
            ...PUBLIC_PAGES,
            ...STATIC_FILES,
          ]),
        )
        .catch(
          () => undefined,
        ),
    );

    self.skipWaiting();
  },
);

self.addEventListener(
  "activate",
  (event) => {
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
                caches.delete(
                  key,
                ),
              ),
          ),
        ),
    );

    self.clients.claim();
  },
);

self.addEventListener(
  "fetch",
  (event) => {
    if (
      event.request.method !==
      "GET"
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

    if (
      isPrivatePath(
        url.pathname,
      )
    ) {
      return;
    }

    if (
      isStaticAsset(url)
    ) {
      event.respondWith(
        caches
          .match(
            event.request,
          )
          .then(
            (cached) =>
              cached ||
              fetch(
                event.request,
              ).then(
                (response) => {
                  if (
                    response.ok
                  ) {
                    const copy =
                      response.clone();

                    caches
                      .open(
                        CACHE,
                      )
                      .then(
                        (cache) =>
                          cache.put(
                            event.request,
                            copy,
                          ),
                      )
                      .catch(
                        () =>
                          undefined,
                      );
                  }

                  return response;
                },
              ),
          ),
      );

      return;
    }

    if (
      event.request.mode ===
        "navigate" &&
      isPublicNavigation(url)
    ) {
      event.respondWith(
        fetch(event.request)
          .then(
            (response) => {
              if (
                response.ok
              ) {
                const copy =
                  response.clone();

                caches
                  .open(CACHE)
                  .then(
                    (cache) =>
                      cache.put(
                        event.request,
                        copy,
                      ),
                  )
                  .catch(
                    () =>
                      undefined,
                  );
              }

              return response;
            },
          )
          .catch(
            async () =>
              (await caches.match(
                event.request,
              )) ||
              (await caches.match(
                "/offline",
              )),
          ),
      );

      return;
    }

    if (
      event.request.mode ===
      "navigate"
    ) {
      event.respondWith(
        fetch(event.request).catch(
          () =>
            caches.match(
              "/offline",
            ),
        ),
      );
    }
  },
);
