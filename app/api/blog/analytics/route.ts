import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_EVENTS = new Set([
  "PAGE_VIEW",
  "SERVICE_CLICK",
  "CALCULATOR_CLICK",
  "ORDER_CLICK",
  "RELATED_CLICK",
]);

function clean(value: unknown, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function dayStart() {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0,
    ),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slug = clean(body?.slug, 100);
    const eventType = clean(body?.eventType, 40);
    const rawSession = clean(body?.sessionId, 120);
    const target = clean(body?.target, 220) || null;

    if (!slug || !rawSession || !ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const article = await prisma.blogArticle.findFirst({
      where: {
        slug,
        OR: [
          { status: "PUBLISHED" },
          {
            status: "SCHEDULED",
            scheduledAt: { lte: new Date() },
          },
        ],
      },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const start = dayStart();
    const sessionHash = createHash("sha256")
      .update(start.toISOString() + "|" + slug + "|" + rawSession)
      .digest("hex");

    const recentCount = await prisma.blogAnalyticsEvent.count({
      where: {
        sessionHash,
        createdAt: { gte: start },
      },
    });

    if (recentCount >= 30) {
      return NextResponse.json({ ok: true });
    }

    await prisma.blogAnalyticsEvent.create({
      data: {
        articleSlug: slug,
        eventType,
        sessionHash,
        target,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
