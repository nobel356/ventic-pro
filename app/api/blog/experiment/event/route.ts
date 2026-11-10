import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EVENTS = new Set([
  "EXPOSURE",
  "CLICK",
]);

const VARIANTS = new Set([
  "CONTROL",
  "VARIANT",
]);

function clean(
  value: unknown,
  max: number,
) {
  return String(
    value || "",
  )
    .trim()
    .slice(0, max);
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json();

    const experimentId =
      clean(
        body?.experimentId,
        120,
      );
    const variant =
      clean(
        body?.variant,
        20,
      );
    const eventType =
      clean(
        body?.eventType,
        30,
      );
    const sessionId =
      clean(
        body?.sessionId,
        160,
      );

    if (
      !experimentId ||
      !sessionId ||
      !VARIANTS.has(
        variant,
      ) ||
      !EVENTS.has(
        eventType,
      )
    ) {
      return NextResponse.json(
        { ok: false },
        { status: 400 },
      );
    }

    const experiment =
      await prisma.croExperiment.findFirst({
        where: {
          id: experimentId,
          status: "RUNNING",
          startedAt: {
            lte: new Date(),
          },
          OR: [
            { endsAt: null },
            {
              endsAt: {
                gt: new Date(),
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

    if (!experiment) {
      return NextResponse.json(
        { ok: false },
        { status: 404 },
      );
    }

    const day =
      new Date()
        .toISOString()
        .slice(0, 10);

    const sessionHash =
      createHash("sha256")
        .update(
          day +
            "|" +
            experimentId +
            "|" +
            sessionId,
        )
        .digest("hex");

    const existing =
      await prisma.croEvent.findFirst({
        where: {
          experimentId,
          variant,
          eventType,
          sessionHash,
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      return NextResponse.json(
        { ok: true },
      );
    }

    await prisma.croEvent.create({
      data: {
        experimentId,
        variant,
        eventType,
        sessionHash,
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 500 },
    );
  }
}
