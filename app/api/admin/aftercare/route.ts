import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

const statuses = new Set([
  "OPEN",
  "SCHEDULED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

const costTypes = new Set([
  "WARRANTY",
  "FREE",
  "PAID",
]);

function ticketDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function ensureSlot(input: {
  orderId: string;
  sourceType: "MAINTENANCE" | "COMPLAINT";
  sourceId: string;
  technicianId: string;
  startsAt: Date;
}) {
  const endsAt = new Date(
    input.startsAt.getTime() + 2 * 60 * 60 * 1000,
  );

  const conflict = await prisma.technicianSlot.findFirst({
    where: {
      technicianId: input.technicianId,
      NOT: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
      startsAt: { lt: endsAt },
      endsAt: { gt: input.startsAt },
    },
  });

  if (conflict) {
    throw new Error("SLOT_CONFLICT");
  }

  await prisma.technicianSlot.deleteMany({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
  });

  await prisma.technicianSlot.create({
    data: {
      technicianId: input.technicianId,
      orderId: input.orderId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      startsAt: input.startsAt,
      endsAt,
    },
  });
}

export async function GET() {
  try {
    await requirePermission(
      PERMISSIONS.AFTERCARE_VIEW,
    );

    const [maintenance, complaints, technicians] =
      await Promise.all([
        prisma.maintenanceRequest.findMany({
          include: {
            order: {
              select: {
                id: true,
                orderNo: true,
                customer: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
            property: {
              select: {
                label: true,
                area: true,
                address: true,
              },
            },
            device: {
              select: {
                type: true,
                brand: true,
                model: true,
              },
            },
            technician: {
              select: {
                id: true,
                name: true,
              },
            },
            warranty: {
              select: {
                status: true,
                endsAt: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 300,
        }),
        prisma.complaint.findMany({
          include: {
            order: {
              select: {
                id: true,
                orderNo: true,
                customer: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
            property: {
              select: {
                label: true,
                area: true,
                address: true,
              },
            },
            device: {
              select: {
                type: true,
                brand: true,
                model: true,
              },
            },
            technician: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 300,
        }),
        prisma.user.findMany({
          where: {
            role: "TECHNICIAN",
            active: true,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        }),
      ]);

    return NextResponse.json({
      maintenance: maintenance.map((item) => ({
        id: item.id,
        kind: "MAINTENANCE",
        orderId: item.orderId,
        orderNo: item.order.orderNo,
        customerName: item.order.customer.name,
        customerPhone: item.order.customer.phone,
        property: item.property
          ? `${item.property.label || "عقار"} — ${item.property.area} — ${item.property.address}`
          : null,
        device: item.device
          ? [
              item.device.type,
              item.device.brand,
              item.device.model,
            ]
              .filter(Boolean)
              .join(" — ")
          : null,
        issue: item.issue,
        status: item.status,
        costType: item.costType,
        chargeAmount: Number(item.chargeAmount),
        appointmentAt: item.appointmentAt,
        technicianId: item.technicianId,
        technicianName:
          item.technician?.name || null,
        createdByCustomer:
          item.createdByCustomer,
        resolution: item.resolution,
        warrantyActive:
          item.warranty?.status === "ACTIVE" &&
          item.warranty.endsAt > new Date(),
        createdAt: item.createdAt,
      })),
      complaints: complaints.map((item) => ({
        id: item.id,
        kind: "COMPLAINT",
        orderId: item.orderId,
        orderNo: item.order.orderNo,
        customerName: item.order.customer.name,
        customerPhone: item.order.customer.phone,
        property: item.property
          ? `${item.property.label || "عقار"} — ${item.property.area} — ${item.property.address}`
          : null,
        device: item.device
          ? [
              item.device.type,
              item.device.brand,
              item.device.model,
            ]
              .filter(Boolean)
              .join(" — ")
          : null,
        issue: item.issue,
        status: item.status,
        costType: item.costType,
        chargeAmount: Number(item.chargeAmount),
        appointmentAt: item.revisitAt,
        technicianId: item.technicianId,
        technicianName:
          item.technician?.name || null,
        createdByCustomer:
          item.createdByCustomer,
        resolution: item.resolution,
        freeRevisit: item.freeRevisit,
        createdAt: item.createdAt,
      })),
      technicians,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر تحميل ما بعد التركيب",
      },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requirePermission(
      PERMISSIONS.AFTERCARE_MANAGE,
    );
    const body = await req.json();
    const kind = String(body?.kind || "");
    const id = String(body?.id || "");
    const status = String(body?.status || "");
    const costType = String(
      body?.costType || "",
    );
    const technicianId = body?.technicianId
      ? String(body.technicianId)
      : null;
    const appointmentAt = ticketDate(
      body?.appointmentAt,
    );
    const chargeAmount = Math.max(
      0,
      Number(body?.chargeAmount || 0),
    );
    const resolution =
      String(body?.resolution || "").trim() ||
      null;

    if (
      !id ||
      !["MAINTENANCE", "COMPLAINT"].includes(
        kind,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "بيانات التذكرة غير صحيحة",
        },
        { status: 400 },
      );
    }

    if (status && !statuses.has(status)) {
      return NextResponse.json(
        {
          error:
            "حالة التذكرة غير صحيحة",
        },
        { status: 400 },
      );
    }

    if (
      costType &&
      !costTypes.has(costType)
    ) {
      return NextResponse.json(
        {
          error:
            "تصنيف التكلفة غير صحيح",
        },
        { status: 400 },
      );
    }

    if (kind === "MAINTENANCE") {
      const current =
        await prisma.maintenanceRequest.findUnique({
          where: { id },
        });

      if (!current) {
        return NextResponse.json(
          {
            error:
              "طلب الصيانة غير موجود",
          },
          { status: 404 },
        );
      }

      if (
        appointmentAt &&
        technicianId
      ) {
        await ensureSlot({
          orderId: current.orderId,
          sourceType: "MAINTENANCE",
          sourceId: current.id,
          technicianId,
          startsAt: appointmentAt,
        });
      }

      const updated =
        await prisma.maintenanceRequest.update({
          where: { id },
          data: {
            ...(status
              ? { status: status as any }
              : {}),
            ...(costType
              ? {
                  costType:
                    costType as any,
                }
              : {}),
            chargeAmount:
              costType === "PAID"
                ? chargeAmount
                : 0,
            appointmentAt,
            technicianId,
            resolution,
            closedAt:
              status === "RESOLVED" ||
              status === "CLOSED"
                ? new Date()
                : null,
          },
        });

      await prisma.auditLog.create({
        data: {
          orderId: current.orderId,
          actorId: actor.id,
          actorLabel: actor.name,
          action:
            "MAINTENANCE_UPDATED",
          oldValue: {
            status: current.status,
            technicianId:
              current.technicianId,
            appointmentAt:
              current.appointmentAt,
            costType:
              current.costType,
            chargeAmount: Number(
              current.chargeAmount,
            ),
          },
          newValue: {
            status: updated.status,
            technicianId:
              updated.technicianId,
            appointmentAt:
              updated.appointmentAt,
            costType:
              updated.costType,
            chargeAmount: Number(
              updated.chargeAmount,
            ),
            resolution:
              updated.resolution,
          },
        },
      });

      return NextResponse.json({
        ok: true,
      });
    }

    const current =
      await prisma.complaint.findUnique({
        where: { id },
      });

    if (!current) {
      return NextResponse.json(
        {
          error:
            "الشكوى غير موجودة",
        },
        { status: 404 },
      );
    }

    if (
      appointmentAt &&
      technicianId
    ) {
      await ensureSlot({
        orderId: current.orderId,
        sourceType: "COMPLAINT",
        sourceId: current.id,
        technicianId,
        startsAt: appointmentAt,
      });
    }

    const updated =
      await prisma.complaint.update({
        where: { id },
        data: {
          ...(status
            ? { status: status as any }
            : {}),
          ...(costType
            ? {
                costType:
                  costType as any,
              }
            : {}),
          freeRevisit:
            costType === "FREE",
          chargeAmount:
            costType === "PAID"
              ? chargeAmount
              : 0,
          revisitAt: appointmentAt,
          technicianId,
          resolution,
          closedAt:
            status === "RESOLVED" ||
            status === "CLOSED"
              ? new Date()
              : null,
        },
      });

    await prisma.auditLog.create({
      data: {
        orderId: current.orderId,
        actorId: actor.id,
        actorLabel: actor.name,
        action: "COMPLAINT_UPDATED",
        oldValue: {
          status: current.status,
          technicianId:
            current.technicianId,
          revisitAt:
            current.revisitAt,
          costType:
            current.costType,
          chargeAmount: Number(
            current.chargeAmount,
          ),
        },
        newValue: {
          status: updated.status,
          technicianId:
            updated.technicianId,
          revisitAt:
            updated.revisitAt,
          costType:
            updated.costType,
          chargeAmount: Number(
            updated.chargeAmount,
          ),
          resolution:
            updated.resolution,
        },
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    if (
      error?.message === "SLOT_CONFLICT"
    ) {
      return NextResponse.json(
        {
          error:
            "الفني لديه موعد متعارض في هذا الوقت",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر تحديث التذكرة",
      },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
