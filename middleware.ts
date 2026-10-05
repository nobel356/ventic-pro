import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function sameSiteMutationAllowed(req: NextRequest) {
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    return true;
  }

  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return true;
  }

  const fetchSite = req.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") {
    return false;
  }

  const origin = req.headers.get("origin");

  // Non-browser/server-to-server requests can legitimately omit Origin.
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const forwardedHost =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      req.nextUrl.host;

    return originUrl.host === forwardedHost;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  if (!sameSiteMutationAllowed(req)) {
    return NextResponse.json(
      { error: "طلب غير مسموح من مصدر خارجي" },
      { status: 403 },
    );
  }

  const res = NextResponse.next();

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );
  res.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=()",
  );
  res.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin",
  );
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
    "form-action 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self' https:",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);

  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    res.headers.set(
      "Cache-Control",
      "no-store, max-age=0",
    );
  }

  return res;
}

export const config = {
  matcher:
    "/((?!_next/static|_next/image|favicon.ico).*)",
};
