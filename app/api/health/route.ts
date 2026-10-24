import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRawUnsafe("SELECT 1");

    return NextResponse.json(
      {
        ok: true,
        service: "ventic-pro",
        database: "ok",
        timestamp: new Date().toISOString(),
        responseMs: Date.now() - startedAt,
        revision:
          process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "ventic-pro",
        database: "unavailable",
        timestamp: new Date().toISOString(),
        responseMs: Date.now() - startedAt,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
