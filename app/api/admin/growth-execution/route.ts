import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
  requireSuperAdmin,
} from "@/lib/auth-v7";
import {
  buildGrowthExecutionClosure,
} from "@/lib/growth-execution";

const KEYS = {
  searchConsoleVerified:
    "growth.indexing.searchConsoleVerified",
  sitemapSubmitted:
    "growth.indexing.sitemapSubmitted",
  indexedUrls:
    "growth.indexing.indexedUrls",
  lastCheckedAt:
    "growth.indexing.lastCheckedAt",
} as const;

export async function GET() {
  try {
    await requirePermission(
      PERMISSIONS.REPORTS_VIEW,
    );

    return NextResponse.json(
      await buildGrowthExecutionClosure(),
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "FAILED",
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

export async function PATCH(
  request: Request,
) {
  try {
    const actor =
      await requireSuperAdmin();

    const body =
      await request.json();

    const searchConsoleVerified =
      body?.searchConsoleVerified ===
      true;

    const sitemapSubmitted =
      body?.sitemapSubmitted ===
      true;

    const indexedUrls =
      Math.max(
        0,
        Math.floor(
          Number(
            body?.indexedUrls ||
              0,
          ),
        ),
      );

    const lastChecked =
      body?.lastCheckedAt
        ? new Date(
            body.lastCheckedAt,
          )
        : new Date();

    if (
      Number.isNaN(
        lastChecked.getTime(),
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

    const rows = [
      [
        KEYS.searchConsoleVerified,
        searchConsoleVerified,
      ],
      [
        KEYS.sitemapSubmitted,
        sitemapSubmitted,
      ],
      [
        KEYS.indexedUrls,
        indexedUrls,
      ],
      [
        KEYS.lastCheckedAt,
        lastChecked.toISOString(),
      ],
    ] as const;

    await prisma.$transaction(
      rows.map(
        ([key, value]) =>
          prisma.runtimeSetting.upsert({
            where: { key },
            update: {
              value,
              updatedById:
                actor.id,
              updatedByLabel:
                actor.name ||
                actor.email,
            },
            create: {
              key,
              value,
              updatedById:
                actor.id,
              updatedByLabel:
                actor.name ||
                actor.email,
            },
          }),
      ),
    );

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel:
          actor.name,
        action:
          "GROWTH_INDEXING_EVIDENCE_UPDATED",
        newValue: {
          searchConsoleVerified,
          sitemapSubmitted,
          indexedUrls,
          lastCheckedAt:
            lastChecked.toISOString(),
        },
      },
    });

    return NextResponse.json(
      await buildGrowthExecutionClosure(),
    );
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
