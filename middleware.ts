import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const FAIL_SAFE_RUNTIME = {
  mode: "LEAD_ONLY",
  leadCapture: true,
  detailedOrders: false,
  customerAccounts: false,
  accountRegistration: false,
  phoneOtp: false,
  emailOtpRecovery: false,
  estimates: false,
  coupons: false,
  referrals: false,
  uploads: false,
  reviews: false,
  aftercare: false,
  portfolio: false,
  notifications: false,
  marketingTracking: false,
  fallbackWhatsapp: "201044226423",
  supportPhone: "01044226423",
  maintenanceMessage:
    "الخدمة الكاملة متوقفة مؤقتًا، لكن سيب اسمك ورقمك وفريق Ventic Pro هيتواصل معاك.",
  leadSuccessMessage:
    "تم تسجيل بياناتك، وفريق Ventic Pro هيتواصل معاك.",
};

function sameSiteMutationAllowed(
  req: NextRequest,
) {
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    return true;
  }

  if (
    !req.nextUrl.pathname.startsWith(
      "/api/",
    )
  ) {
    return true;
  }

  const fetchSite =
    req.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") {
    return false;
  }

  const origin =
    req.headers.get("origin");

  if (!origin) return true;

  try {
    const originUrl =
      new URL(origin);
    const forwardedHost =
      req.headers.get(
        "x-forwarded-host",
      ) ||
      req.headers.get("host") ||
      req.nextUrl.host;

    return (
      originUrl.host ===
      forwardedHost
    );
  } catch {
    return false;
  }
}

function shouldIsolateWindow(
  pathname: string,
) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith(
      "/technician",
    ) ||
    pathname.startsWith(
      "/customer/account",
    ) ||
    pathname.startsWith("/api/") ||
    pathname === "/login"
  );
}

function bypassRuntimeRouting(
  pathname: string,
) {
  return (
    pathname === "/login" ||
    pathname === "/callback" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith(
      "/technician",
    ) ||
    pathname.startsWith("/api/") ||
    pathname === "/runtime-lock"
  );
}

function looksLikeAsset(
  pathname: string,
) {
  return /\.[a-zA-Z0-9]{1,8}$/.test(
    pathname,
  );
}

function shouldProbeRuntime(
  req: NextRequest,
) {
  if (
    req.method !== "GET" &&
    req.method !== "HEAD"
  ) {
    return false;
  }

  const pathname =
    req.nextUrl.pathname;

  if (
    bypassRuntimeRouting(pathname) ||
    pathname.startsWith("/_next/") ||
    looksLikeAsset(pathname)
  ) {
    return false;
  }

  return true;
}

function encodeRuntimeSnapshot(
  value: unknown,
) {
  return encodeURIComponent(
    JSON.stringify(value),
  );
}

async function runtimeSnapshot(
  req: NextRequest,
) {
  try {
    const url =
      req.nextUrl.clone();

    url.pathname = "/api/runtime";
    url.search = "";

    const response = await fetch(
      url,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "x-ventic-runtime-probe":
            "1",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        "runtime probe failed",
      );
    }

    const data =
      await response.json();

    if (
      data?.mode !== "NORMAL" &&
      data?.mode !== "LEAD_ONLY" &&
      data?.mode !== "MAINTENANCE"
    ) {
      throw new Error(
        "invalid runtime mode",
      );
    }

    return data;
  } catch {
    return FAIL_SAFE_RUNTIME;
  }
}

function applySecurityHeaders(
  res: NextResponse,
  pathname: string,
) {
  res.headers.set(
    "X-Content-Type-Options",
    "nosniff",
  );
  res.headers.set(
    "X-Frame-Options",
    "DENY",
  );
  res.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );
  res.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=()",
  );

  if (
    shouldIsolateWindow(pathname)
  ) {
    res.headers.set(
      "Cross-Origin-Opener-Policy",
      "same-origin",
    );
  }

  res.headers.set(
    "X-DNS-Prefetch-Control",
    "off",
  );
  res.headers.set(
    "X-Permitted-Cross-Domain-Policies",
    "none",
  );

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.tiktok.com https://www.googletagmanager.com",
    "form-action 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://scripts.clarity.ms https://connect.facebook.net https://analytics.tiktok.com",
    "connect-src 'self' https:",
  ].join("; ");

  res.headers.set(
    "Content-Security-Policy",
    csp,
  );

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  if (
    pathname.startsWith("/api/")
  ) {
    res.headers.set(
      "Cache-Control",
      "no-store, max-age=0",
    );
  }

  return res;
}

export async function middleware(
  req: NextRequest,
) {
  if (
    !sameSiteMutationAllowed(req)
  ) {
    return NextResponse.json(
      {
        error:
          "طلب غير مسموح من مصدر خارجي",
      },
      { status: 403 },
    );
  }

  const pathname =
    req.nextUrl.pathname;

  const requestHeaders =
    new Headers(req.headers);

  requestHeaders.set(
    "x-ventic-pathname",
    pathname,
  );

  if (
    pathname === "/runtime-lock" &&
    req.headers.get(
      "x-ventic-runtime-lock",
    ) !== "1"
  ) {
    const home =
      req.nextUrl.clone();

    home.pathname = "/";
    home.search = "";

    return applySecurityHeaders(
      NextResponse.redirect(home),
      pathname,
    );
  }

  let response: NextResponse;

  if (shouldProbeRuntime(req)) {
    const runtime =
      await runtimeSnapshot(req);

    requestHeaders.set(
      "x-ventic-runtime-control",
      encodeRuntimeSnapshot(runtime),
    );

    if (
      runtime.mode !== "NORMAL"
    ) {
      requestHeaders.set(
        "x-ventic-runtime-lock",
        "1",
      );

      const lockUrl =
        req.nextUrl.clone();

      lockUrl.pathname =
        "/runtime-lock";
      lockUrl.search = "";

      response =
        NextResponse.rewrite(
          lockUrl,
          {
            request: {
              headers:
                requestHeaders,
            },
          },
        );

      response.headers.set(
        "X-Robots-Tag",
        "noindex, nofollow",
      );
      response.headers.set(
        "Cache-Control",
        "private, no-cache, no-store, max-age=0, must-revalidate",
      );
    } else {
      response =
        NextResponse.next({
          request: {
            headers:
              requestHeaders,
          },
        });
    }
  } else {
    response =
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
  }

  return applySecurityHeaders(
    response,
    pathname,
  );
}

export const config = {
  matcher:
    "/((?!_next/static|_next/image|favicon.ico).*)",
};
