import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
} from "@/lib/auth-v7";

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

const kinds = new Set([
  "INCIDENT",
  "CHANGE",
]);

const severities =
  new Set([
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ]);

const statuses =
  new Set([
    "OPEN",
    "MONITORING",
    "RESOLVED",
    "CLOSED",
  ]);

export async function GET() {
  try {
    await requireSuperAdmin();

    const items =
      await prisma.opsChangeLog.findMany({
        orderBy: [
          {
            occurredAt:
              "desc",
          },
          {
            createdAt:
              "desc",
          },
        ],
        take: 200,
      });

    return NextResponse.json({
      items,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "FAILED",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const actor =
      await requireSuperAdmin();

    const body =
      await request.json();

    const kind =
      clean(
        body?.kind,
        30,
      );
    const severity =
      clean(
        body?.severity,
        30,
      );
    const status =
      clean(
        body?.status,
        30,
      );
    const title =
      clean(
        body?.title,
        240,
      );

    if (
      !kinds.has(kind) ||
      !severities.has(
        severity,
      ) ||
      !statuses.has(
        status,
      ) ||
      !title
    ) {
      return NextResponse.json(
        {
          error:
            "INVALID_INPUT",
        },
        { status: 400 },
      );
    }

    const occurredAt =
      body?.occurredAt
        ? new Date(
            body.occurredAt,
          )
        : new Date();

    const saved =
      await prisma.opsChangeLog.create({
        data: {
          kind,
          severity,
          status,
          title,
          detail:
            clean(
              body?.detail,
              5000,
            ) || null,
          rootCause:
            clean(
              body?.rootCause,
              5000,
            ) || null,
          resolution:
            clean(
              body?.resolution,
              5000,
            ) || null,
          relatedSha:
            clean(
              body?.relatedSha,
              80,
            ) || null,
          occurredAt,
          resolvedAt:
            status ===
              "RESOLVED" ||
            status ===
              "CLOSED"
              ? new Date()
              : null,
          createdByLabel:
            actor.name ||
            actor.email,
        },
      });

    await prisma.auditLog.create({
      data: {
        actorId:
          actor.id,
        actorLabel:
          actor.name,
        action:
          "OPS_LOG_CREATED",
        newValue: {
          id: saved.id,
          kind,
          severity,
          status,
          title,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      id: saved.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "FAILED",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const actor =
      await requireSuperAdmin();

    const body =
      await request.json();

    const id =
      clean(
        body?.id,
        120,
      );
    const status =
      clean(
        body?.status,
        30,
      );

    if (
      !id ||
      !statuses.has(
        status,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "INVALID_INPUT",
        },
        { status: 400 },
      );
    }

    const saved =
      await prisma.opsChangeLog.update({
        where: { id },
        data: {
          status,
          rootCause:
            body?.rootCause ===
            undefined
              ? undefined
              : clean(
                    body
                      .rootCause,
                    5000,
                  ) ||
                null,
          resolution:
            body?.resolution ===
            undefined
              ? undefined
              : clean(
                    body
                      .resolution,
                    5000,
                  ) ||
                null,
          resolvedAt:
            status ===
              "RESOLVED" ||
            status ===
              "CLOSED"
              ? new Date()
              : null,
        },
      });

    await prisma.auditLog.create({
      data: {
        actorId:
          actor.id,
        actorLabel:
          actor.name,
        action:
          "OPS_LOG_UPDATED",
        newValue: {
          id: saved.id,
          status:
            saved.status,
        },
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "FAILED",
      },
      { status: 500 },
    );
  }
}
