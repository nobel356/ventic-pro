import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
} from "@/lib/auth-v7";
import {
  buildProductionVerification,
  productionExpectedShaKey,
} from "@/lib/production-verification";

function cleanSha(
  value: unknown,
) {
  const sha =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!sha) return "";

  if (
    !/^[a-f0-9]{40}$/.test(
      sha,
    )
  ) {
    throw new Error(
      "INVALID_GIT_SHA",
    );
  }

  return sha;
}

export async function GET() {
  try {
    await requireSuperAdmin();

    return NextResponse.json(
      await buildProductionVerification(),
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

    const sha =
      cleanSha(
        body?.expectedGithubSha,
      );

    await prisma.runtimeSetting.upsert({
      where: {
        key:
          productionExpectedShaKey,
      },
      update: {
        value: sha,
        updatedById:
          actor.id,
        updatedByLabel:
          actor.name ||
          actor.email,
      },
      create: {
        key:
          productionExpectedShaKey,
        value: sha,
        updatedById:
          actor.id,
        updatedByLabel:
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
          "PRODUCTION_EXPECTED_SHA_UPDATED",
        newValue: {
          sha,
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
      {
        status:
          error?.message ===
          "INVALID_GIT_SHA"
            ? 400
            : 500,
      },
    );
  }
}
