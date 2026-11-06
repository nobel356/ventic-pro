import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-v7";
import {
  DEGRADED_RUNTIME_CONTROL,
  resolveRuntimeControl,
} from "@/lib/runtime-control";
import { runNonBlockingEffect } from "@/lib/lead-resilience";

export async function POST() {
  try {
    const actor =
      await requireSuperAdmin();

    const startedAt = Date.now();

    const runtimeFallback =
      await resolveRuntimeControl(
        async () => {
          throw new Error(
            "V20V_SIMULATED_RUNTIME_DB_READ_FAILURE",
          );
        },
        () => {},
      );

    const runtimeFailSafePass =
      runtimeFallback.degraded ===
        true &&
      runtimeFallback.control.mode ===
        "LEAD_ONLY" &&
      runtimeFallback.control
        .leadCapture === true &&
      runtimeFallback.control
        .notifications === false &&
      runtimeFallback.control
        .marketingTracking === false &&
      runtimeFallback.control
        .detailedOrders === false &&
      DEGRADED_RUNTIME_CONTROL
        .leadCapture === true;

    if (!runtimeFailSafePass) {
      throw new Error(
        "RUNTIME_FAILSAFE_SIMULATION_FAILED",
      );
    }

    const marker =
      `V20V-${crypto.randomUUID()}`;

    const leadResult =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.lead.create({
              data: {
                name:
                  "V20V RESILIENCE TEST — DO NOT CONTACT",
                phone: null,
                source:
                  "V20V_RESILIENCE",
                status:
                  "STARTED",
                currentStep: 1,
                consentToFollowUp:
                  false,
                payload: {
                  marker,
                  noContact: true,
                  simulatedFailure:
                    "ADMIN_NOTIFICATION",
                },
                lastActivityAt:
                  new Date(),
              },
            });

          const notification =
            await runNonBlockingEffect(
              async () => {
                throw new Error(
                  "V20V_SIMULATED_NOTIFICATION_FAILURE",
                );
              },
            );

          if (notification.ok) {
            throw new Error(
              "NOTIFICATION_FAILURE_NOT_ISOLATED",
            );
          }

          const survived =
            await tx.lead.findUnique({
              where: {
                id: created.id,
              },
            });

          if (!survived) {
            throw new Error(
              "LEAD_LOST_AFTER_NOTIFICATION_FAILURE",
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
              "RESILIENCE_TEST_CLEANUP_FAILED",
            );
          }

          return {
            leadWritten: true,
            notificationFailureIsolated:
              true,
            leadSurvivedNotificationFailure:
              true,
            cleanup: true,
          };
        },
      );

    const result = {
      ok: true,
      runtimeFailSafe: true,
      runtimeMode:
        runtimeFallback.control.mode,
      leadCapturePreserved:
        runtimeFallback.control
          .leadCapture,
      nonessentialFeaturesDisabled:
        !runtimeFallback.control
          .notifications &&
        !runtimeFallback.control
          .marketingTracking &&
        !runtimeFallback.control
          .detailedOrders,
      ...leadResult,
      durationMs:
        Date.now() -
        startedAt,
    };

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel:
          actor.name,
        action:
          "RESILIENCE_FAILURE_LAB",
        newValue: result,
      },
    });

    return NextResponse.json(
      result,
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "RESILIENCE_HEALTHCHECK_FAILED",
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
