import { requireSuperAdmin } from "@/lib/auth-v7";

function firstUrl(value: string) {
  const match = value.match(/https?:\/\/[^\s]+/i);
  return (match?.[0] || value.trim()).replace(/[),.]+$/, "");
}

function extractTikTokId(value: string) {
  const direct =
    value.match(/\/video\/(\d{10,30})/i) ||
    value.match(/\/player\/v1\/(\d{10,30})/i);

  return direct?.[1] || null;
}

function allowedTikTokHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "tiktok.com" || host.endsWith(".tiktok.com");
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const input = firstUrl(String(body?.url || ""));

    if (!input) {
      return Response.json(
        { error: "INVALID_TIKTOK_URL" },
        { status: 400 },
      );
    }

    let parsed: URL;

    try {
      parsed = new URL(input);
    } catch {
      return Response.json(
        { error: "INVALID_TIKTOK_URL" },
        { status: 400 },
      );
    }

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !allowedTikTokHost(parsed.hostname)
    ) {
      return Response.json(
        { error: "INVALID_TIKTOK_URL" },
        { status: 400 },
      );
    }

    const directId = extractTikTokId(parsed.toString());

    if (directId) {
      return Response.json({
        videoId: directId,
        resolvedUrl: parsed.toString(),
      });
    }

    const response = await fetch(parsed.toString(), {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/155 Safari/537.36",
      },
    });

    const finalUrl = response.url || parsed.toString();
    const finalParsed = new URL(finalUrl);

    if (!allowedTikTokHost(finalParsed.hostname)) {
      return Response.json(
        { error: "INVALID_TIKTOK_URL" },
        { status: 400 },
      );
    }

    const videoId = extractTikTokId(finalUrl);

    if (!videoId) {
      return Response.json(
        { error: "TIKTOK_RESOLVE_FAILED" },
        { status: 400 },
      );
    }

    return Response.json({
      videoId,
      resolvedUrl: finalUrl,
    });
  } catch (error: any) {
    const message = String(error?.message || "FAILED");

    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 500;

    return Response.json(
      {
        error:
          status === 500
            ? "TIKTOK_RESOLVE_FAILED"
            : message,
      },
      { status },
    );
  }
}
