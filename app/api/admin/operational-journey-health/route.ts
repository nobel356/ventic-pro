import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-v7";
import { hashOtp } from "@/lib/otp";
import {
  completeExecution,
  confirmNoExecutionMaterials,
} from "@/lib/order-execution";
import {
  canAdminStatusTransition,
  canAssignTechnician,
  canExecutionMutate,
  technicianNextStatus,
} from "@/lib/order-lifecycle";
import {
  customerDeviceForOrderWhere,
} from "@/lib/customer-journey-security";

async function cleanup(input: {
  orderId?: string;
  propertyId?: string;
  customerId?: string;
  technicianId?: string;
}) {
  if (input.orderId) {
    await prisma.notification.deleteMany({
      where: {
        orderId: input.orderId,
      },
    });

    await prisma.auditLog.deleteMany({
      where: {
        orderId: input.orderId,
      },
    });

    await prisma.device.deleteMany({
      where: {
        sourceOrderId:
          input.orderId,
      },
    });

    await prisma.order.deleteMany({
      where: {
        id: input.orderId,
      },
    });
  }

  if (input.propertyId) {
    await prisma.property.deleteMany({
      where: {
        id: input.propertyId,
      },
    });
  }

  if (input.customerId) {
    await prisma.customer.deleteMany({
      where: {
        id: input.customerId,
      },
    });
  }

  if (input.technicianId) {
    await prisma.user.deleteMany({
      where: {
        id: input.technicianId,
      },
    });
  }
}

export async function POST() {
  const startedAt = Date.now();

  let orderId:
    | string
    | undefined;
  let propertyId:
    | string
    | undefined;
  let customerId:
    | string
    | undefined;
  let technicianId:
    | string
    | undefined;

  try {
    const actor =
      await requireSuperAdmin();

    const marker =
      crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 14);
    const digits =
      String(Date.now())
        .slice(-7)
        .padStart(7, "0");

    const customer =
      await prisma.customer.create({
        data: {
          name:
            "V20X Operational Test — DO NOT CONTACT",
          phone:
            `0100${digits}`,
        },
      });
    customerId = customer.id;

    const property =
      await prisma.property.create({
        data: {
          customerId:
            customer.id,
          label:
            "V20X Test Property",
          governorate:
            "Test",
          area:
            "Test",
          address:
            "V20X synthetic address",
        },
      });
    propertyId = property.id;

    const technician =
      await prisma.user.create({
        data: {
          name:
            "V20X Test Technician",
          email:
            `v20x-${marker}@health.invalid`,
          role:
            "TECHNICIAN",
        },
      });
    technicianId =
      technician.id;

    const order =
      await prisma.order.create({
        data: {
          orderNo:
            `V20X-${marker}`,
          customerId:
            customer.id,
          propertyId:
            property.id,
          status:
            "NEW",
          governorate:
            "Test",
          area:
            "Test",
          address:
            "V20X synthetic address",
          preferredDate:
            "2099-01-01",
          preferredTime:
            "AM",
        },
      });
    orderId = order.id;

    const stateMachine =
      canAdminStatusTransition(
        "NEW",
        "CONFIRMED",
      ) &&
      !canAdminStatusTransition(
        "NEW",
        "IN_PROGRESS",
      ) &&
      !canAdminStatusTransition(
        "CONFIRMED",
        "ASSIGNED",
      );

    if (!stateMachine) {
      throw new Error(
        "ADMIN_STATE_MACHINE_FAILED",
      );
    }

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status:
          "CONFIRMED",
      },
    });

    if (
      !canAssignTechnician(
        "CONFIRMED",
      )
    ) {
      throw new Error(
        "ASSIGNMENT_GATE_FAILED",
      );
    }

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        technicianId:
          technician.id,
        status:
          "ASSIGNED",
      },
    });

    const firstNext =
      technicianNextStatus(
        "ASSIGNED",
      );
    const secondNext =
      technicianNextStatus(
        "ON_THE_WAY",
      );
    const thirdNext =
      technicianNextStatus(
        "ARRIVED",
      );

    if (
      firstNext !==
        "ON_THE_WAY" ||
      secondNext !==
        "ARRIVED" ||
      thirdNext !==
        "IN_PROGRESS"
    ) {
      throw new Error(
        "TECHNICIAN_STATE_MACHINE_FAILED",
      );
    }

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status:
          firstNext,
      },
    });

    const reassignmentLocked =
      !canAssignTechnician(
        "ON_THE_WAY",
      );

    if (!reassignmentLocked) {
      throw new Error(
        "REASSIGNMENT_LOCK_FAILED",
      );
    }

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status:
          secondNext,
      },
    });

    const beforeAtArrival =
      canExecutionMutate(
        "ARRIVED",
        "BEFORE_PHOTO",
      );
    const afterAtArrivalDenied =
      !canExecutionMutate(
        "ARRIVED",
        "AFTER_PHOTO",
      );
    const materialsAtArrivalDenied =
      !canExecutionMutate(
        "ARRIVED",
        "MATERIALS",
      );

    if (
      !beforeAtArrival ||
      !afterAtArrivalDenied ||
      !materialsAtArrivalDenied
    ) {
      throw new Error(
        "EXECUTION_SEQUENCE_FAILED",
      );
    }

    await prisma.attachment.create({
      data: {
        orderId:
          order.id,
        kind:
          "BEFORE",
        fileName:
          "v20x-before.jpg",
        mimeType:
          "image/jpeg",
        storagePath:
          "v20x://synthetic/before",
        uploadedBy:
          technician.id,
      },
    });

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status:
          thirdNext,
      },
    });

    const inProgressActions =
      canExecutionMutate(
        "IN_PROGRESS",
        "AFTER_PHOTO",
      ) &&
      canExecutionMutate(
        "IN_PROGRESS",
        "MATERIALS",
      ) &&
      canExecutionMutate(
        "IN_PROGRESS",
        "OTP",
      ) &&
      canExecutionMutate(
        "IN_PROGRESS",
        "COMPLETE",
      );

    if (!inProgressActions) {
      throw new Error(
        "IN_PROGRESS_GATE_FAILED",
      );
    }

    await prisma.attachment.create({
      data: {
        orderId:
          order.id,
        kind:
          "AFTER",
        fileName:
          "v20x-after.jpg",
        mimeType:
          "image/jpeg",
        storagePath:
          "v20x://synthetic/after",
        uploadedBy:
          technician.id,
      },
    });

    await confirmNoExecutionMaterials(
      prisma,
      {
        orderId:
          order.id,
        assignedTechnicianId:
          technician.id,
        actor: {
          id:
            technician.id,
          name:
            technician.name,
          mode:
            "TECHNICIAN",
        },
      },
    );

    const space =
      await prisma.space.create({
        data: {
          orderId:
            order.id,
          type:
            "BATHROOM",
          label:
            "V20X Bathroom",
          details: {
            location:
              "V20X Test",
          },
        },
      });

    await prisma.orderService.create({
      data: {
        spaceId:
          space.id,
        serviceCodeSnapshot:
          "BATH_BLOWER",
        serviceNameSnapshot:
          "بلاور حمام",
        qty: 1,
        unitPriceSnapshot:
          100,
      },
    });

    await prisma.quote.create({
      data: {
        orderId:
          order.id,
        amount:
          100,
        status:
          "ACCEPTED",
        customerToken:
          `v20x-${marker}`,
        sentAt:
          new Date(),
        respondedAt:
          new Date(),
      },
    });

    const otp =
      "654321";

    await prisma.order.update({
      where: {
        id:
          order.id,
      },
      data: {
        completionOtpHash:
          hashOtp(
            order.id,
            otp,
          ),
        completionOtpExpiresAt:
          new Date(
            Date.now() +
              5 * 60 * 1000,
          ),
      },
    });

    const completed =
      await completeExecution(
        prisma,
        {
          orderId:
            order.id,
          assignedTechnicianId:
            technician.id,
          actor: {
            id:
              technician.id,
            name:
              technician.name,
            mode:
              "TECHNICIAN",
          },
          otp,
          diagnostic: {
            bypassRateLimits:
              true,
            suppressNotifications:
              true,
          },
        },
      );

    const [
      completedOrder,
      invoice,
      warranty,
      device,
    ] = await Promise.all([
      prisma.order.findUnique({
        where: {
          id:
            order.id,
        },
      }),
      prisma.invoice.findUnique({
        where: {
          orderId:
            order.id,
        },
      }),
      prisma.warranty.findFirst({
        where: {
          orderId:
            order.id,
          status:
            "ACTIVE",
        },
      }),
      prisma.device.findFirst({
        where: {
          sourceOrderId:
            order.id,
        },
      }),
    ]);

    const otpCompletion =
      completed.ok === true &&
      completedOrder?.status ===
        "COMPLETED" &&
      !completedOrder
        ?.completionOtpHash &&
      !completedOrder
        ?.completionOtpExpiresAt;

    const invoiceGenerated =
      Boolean(invoice) &&
      Number(invoice?.total) ===
        100 &&
      completed.invoiceTotal ===
        100;

    const warrantyGenerated =
      Boolean(warranty) &&
      Boolean(
        warranty?.endsAt &&
          warranty.endsAt >
            warranty.startsAt,
      );

    const deviceGenerated =
      Boolean(device) &&
      device?.propertyId ===
        property.id &&
      device?.sourceOrderId ===
        order.id;

    const aftercareReady =
      Boolean(
        warranty &&
          device &&
          (await prisma.device.findFirst({
            where:
              customerDeviceForOrderWhere(
                customer.id,
                {
                  id:
                    order.id,
                  propertyId:
                    property.id,
                },
                device.id,
              ),
          })),
      );

    if (
      !otpCompletion ||
      !invoiceGenerated ||
      !warrantyGenerated ||
      !deviceGenerated ||
      !aftercareReady
    ) {
      throw new Error(
        "COMPLETION_OUTPUTS_FAILED",
      );
    }

    const proof = {
      stateMachine,
      assignmentLock:
        reassignmentLocked,
      executionSequencing:
        beforeAtArrival &&
        afterAtArrivalDenied &&
        materialsAtArrivalDenied &&
        inProgressActions,
      otpCompletion,
      invoiceGenerated,
      warrantyGenerated,
      deviceGenerated,
      aftercareReady,
    };

    await cleanup({
      orderId,
      propertyId,
      customerId,
      technicianId,
    });

    const [
      orderLeft,
      propertyLeft,
      customerLeft,
      technicianLeft,
    ] = await Promise.all([
      prisma.order.findUnique({
        where: {
          id:
            orderId,
        },
      }),
      prisma.property.findUnique({
        where: {
          id:
            propertyId,
        },
      }),
      prisma.customer.findUnique({
        where: {
          id:
            customerId,
        },
      }),
      prisma.user.findUnique({
        where: {
          id:
            technicianId,
        },
      }),
    ]);

    const cleanupPassed =
      !orderLeft &&
      !propertyLeft &&
      !customerLeft &&
      !technicianLeft;

    if (!cleanupPassed) {
      throw new Error(
        "OPERATIONAL_CLEANUP_FAILED",
      );
    }

    const result = {
      ok: true,
      ...proof,
      cleanup:
        cleanupPassed,
      durationMs:
        Date.now() -
        startedAt,
    };

    await prisma.auditLog.create({
      data: {
        actorId:
          actor.id,
        actorLabel:
          actor.name,
        action:
          "OPERATIONAL_JOURNEY_HEALTHCHECK",
        newValue:
          result,
      },
    });

    return NextResponse.json(
      result,
    );
  } catch (error: any) {
    try {
      await cleanup({
        orderId,
        propertyId,
        customerId,
        technicianId,
      });
    } catch (cleanupError) {
      console.error(
        "V20X_CLEANUP_FAILED",
        cleanupError,
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "OPERATIONAL_JOURNEY_HEALTHCHECK_FAILED",
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
