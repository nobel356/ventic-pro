import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
} from "@/lib/auth-v7";

function clean(value: unknown, max = 1200) {
  return String(value || "").trim().slice(0, max);
}

function ageHours(date: Date | null) {
  if (!date) return null;
  return Number(
    ((Date.now() - date.getTime()) / 3600000).toFixed(1),
  );
}

export async function GET() {
  try {
    await requireSuperAdmin();

    const records =
      await prisma.disasterRecoveryRecord.findMany({
        orderBy: {
          occurredAt: "desc",
        },
        take: 50,
      });

    const latestBackup =
      records.find(
        (item) =>
          item.recordType === "BACKUP",
      ) || null;

    const latestRestore =
      records.find(
        (item) =>
          item.recordType ===
          "RESTORE_DRILL",
      ) || null;

    const backupAgeHours =
      ageHours(
        latestBackup?.occurredAt ||
          null,
      );

    return NextResponse.json({
      records,
      summary: {
        latestBackup,
        latestRestore,
        backupAgeHours,
        backupFresh:
          backupAgeHours !== null &&
          backupAgeHours <= 48,
        restoreVerified:
          latestRestore?.status ===
            "PASS" ||
          latestRestore?.status ===
            "PARTIAL_PASS",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message || "FAILED",
      },
      {
        status:
          error?.message ===
          "UNAUTHENTICATED"
            ? 401
            : error?.message ===
                "FORBIDDEN"
              ? 403
              : 500,
      },
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

    const recordType =
      clean(
        body?.recordType,
        40,
      );
    const status =
      clean(
        body?.status,
        40,
      );

    if (
      ![
        "BACKUP",
        "RESTORE_DRILL",
      ].includes(recordType)
    ) {
      return NextResponse.json(
        {
          error:
            "RECORD_TYPE_NOT_ALLOWED",
        },
        { status: 400 },
      );
    }

    if (
      ![
        "PASS",
        "PARTIAL_PASS",
        "FAIL",
      ].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            "STATUS_NOT_ALLOWED",
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

    if (
      Number.isNaN(
        occurredAt.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "INVALID_DATE",
        },
        { status: 400 },
      );
    }

    const saved =
      await prisma.disasterRecoveryRecord.create({
        data: {
          recordType,
          status,
          provider:
            clean(
              body?.provider,
              80,
            ) ||
            "Neon",
          providerRef:
            clean(
              body?.providerRef,
              240,
            ) || null,
          occurredAt,
          note:
            clean(
              body?.note,
              2000,
            ) || null,
          createdByLabel:
            actor.name ||
            actor.email,
        },
      });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel:
          actor.name,
        action:
          "DR_RECORD_CREATED",
        newValue: {
          id: saved.id,
          recordType:
            saved.recordType,
          status:
            saved.status,
          occurredAt:
            saved.occurredAt,
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
          error?.message || "FAILED",
      },
      { status: 500 },
    );
  }
}
