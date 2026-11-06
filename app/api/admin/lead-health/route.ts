import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-v7";
import { leadRequestTypeFromPayload } from "@/lib/lead-capture";

export async function POST() {
  try {
    const actor =
      await requireSuperAdmin();

    const startedAt = Date.now();
    const marker =
      `V20U-${crypto.randomUUID()}`;

    const legacyAlias =
      leadRequestTypeFromPayload({
        requestType:
          "QUICK_CONTACT",
      });

    if (
      legacyAlias !==
      "QUICK_REQUEST"
    ) {
      throw new Error(
        "LEGACY_QUICK_CONTACT_ALIAS_FAILED",
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.lead.create({
              data: {
                name:
                  "V20U HEALTH CHECK — DO NOT CONTACT",
                phone: null,
                source:
                  "V20U_HEALTHCHECK",
                status:
                  "STARTED",
                currentStep: 1,
                consentToFollowUp:
                  false,
                payload: {
                  marker,
                  requestType:
                    "HEALTHCHECK",
                  noContact: true,
                },
                lastActivityAt:
                  new Date(),
              },
            });

          const readBack =
            await tx.lead.findUnique({
              where: {
                id: created.id,
              },
            });

          if (
            !readBack ||
            readBack.source !==
              "V20U_HEALTHCHECK"
          ) {
            throw new Error(
              "LEAD_DB_READBACK_FAILED",
            );
          }

          const visibleToAdmin =
            await tx.lead.findFirst({
              where: {
                id: created.id,
                archivedAt: null,
                status: {
                  in: [
                    "STARTED",
                    "CONTACTED",
                    "ABANDONED",
                  ],
                },
              },
            });

          if (!visibleToAdmin) {
            throw new Error(
              "LEAD_ADMIN_VISIBILITY_FAILED",
            );
          }

          await tx.lead.delete({
            where: {
              id: created.id,
            },
          });

          const cleaned =
            await tx.lead.findUnique({
              where: {
                id: created.id,
              },
            });

          if (cleaned) {
            throw new Error(
              "LEAD_HEALTH_CLEANUP_FAILED",
            );
          }

          return {
            write: true,
            read: true,
            adminVisible: true,
            cleanup: true,
          };
        },
      );

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel:
          actor.name,
        action:
          "LEAD_CAPTURE_HEALTHCHECK",
        newValue: {
          ok: true,
          ...result,
          legacyQuickContactAlias:
            legacyAlias,
          durationMs:
            Date.now() -
            startedAt,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      ...result,
      legacyQuickContactAlias:
        legacyAlias,
      durationMs:
        Date.now() -
        startedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "LEAD_HEALTHCHECK_FAILED",
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
