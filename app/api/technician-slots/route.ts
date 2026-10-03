import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  can,
  requirePermission,
} from "@/lib/auth-v7";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/admin-notifications";
import { formatAppointmentForOrder } from "@/lib/order-appointment";

function validDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.ORDERS_VIEW);
    const { searchParams } = new URL(req.url);

    const start =
      validDate(searchParams.get("start")) ||
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const end =
      validDate(searchParams.get("end")) ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (end <= start) {
      return NextResponse.json(
        { error: "نطاق التاريخ غير صحيح" },
        { status: 400 },
      );
    }

    const slots = await prisma.technicianSlot.findMany({
      where: {
        startsAt: { lt: end },
        endsAt: { gt: start },
        OR: [
          { orderId: null },
          {
            order: {
              status: {
                notIn: ["COMPLETED", "CANCELLED"],
              },
            },
          },
        ],
      },
      include: {
        technician: {
          select: { id: true, name: true },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            customer: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [{ startsAt: "asc" }, { technicianId: "asc" }],
    });

    return NextResponse.json({
      slots,
      canManage: can(
        actor.role,
        PERMISSIONS.ASSIGN_TECH,
        actor.permissions,
      ),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "تعذر تحميل جدول الفنيين" },
      {
        status:
          error.message === "UNAUTHENTICATED"
            ? 401
            : error.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.ASSIGN_TECH);
    const body = await req.json();

    const technicianId = String(body?.technicianId || "");
    const orderId = body?.orderId ? String(body.orderId) : null;
    const start = validDate(body?.startsAt || null);
    const end = validDate(body?.endsAt || null);

    if (!technicianId || !start || !end) {
      return NextResponse.json(
        { error: "الفني ووقت البداية والنهاية مطلوبون" },
        { status: 400 },
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "وقت النهاية يجب أن يكون بعد البداية" },
        { status: 400 },
      );
    }

    const technician = await prisma.user.findFirst({
      where: {
        id: technicianId,
        role: "TECHNICIAN",
        active: true,
      },
      select: { id: true, name: true },
    });

    if (!technician) {
      return NextResponse.json(
        { error: "الفني غير موجود أو غير نشط" },
        { status: 404 },
      );
    }

    const clash = await prisma.technicianSlot.findFirst({
      where: {
        technicianId,
        startsAt: { lt: end },
        endsAt: { gt: start },
        ...(orderId ? { NOT: { orderId } } : {}),
        OR: [
          { orderId: null },
          {
            order: {
              status: {
                notIn: ["COMPLETED", "CANCELLED"],
              },
            },
          },
        ],
      },
      include: {
        order: {
          select: { orderNo: true },
        },
      },
    });

    if (clash) {
      return NextResponse.json(
        {
          error: `الفني لديه حجز متعارض${
            clash.order?.orderNo
              ? ` مع الطلب ${clash.order.orderNo}`
              : ""
          } في هذا الوقت`,
        },
        { status: 409 },
      );
    }

    let order:
      | {
          id: string;
          orderNo: string;
          status: string;
          technicianId: string | null;
        }
      | null = null;

    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNo: true,
          status: true,
          technicianId: true,
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "الطلب غير موجود" },
          { status: 404 },
        );
      }

      if (
        order.status === "COMPLETED" ||
        order.status === "CANCELLED"
      ) {
        return NextResponse.json(
          { error: "لا يمكن حجز موعد لطلب مكتمل أو ملغي" },
          { status: 400 },
        );
      }
    }

    const oldSlot = orderId
      ? await prisma.technicianSlot.findFirst({
          where: { orderId },
          orderBy: { createdAt: "desc" },
        })
      : null;

    const orderAppointment = formatAppointmentForOrder(start, end);

    const slot = await prisma.$transaction(async (tx) => {
      const savedSlot = oldSlot
        ? await tx.technicianSlot.update({
            where: { id: oldSlot.id },
            data: {
              technicianId,
              startsAt: start,
              endsAt: end,
            },
            include: {
              technician: {
                select: { id: true, name: true },
              },
              order: {
                select: {
                  id: true,
                  orderNo: true,
                  customer: {
                    select: { name: true },
                  },
                },
              },
            },
          })
        : await tx.technicianSlot.create({
            data: {
              technicianId,
              orderId,
              startsAt: start,
              endsAt: end,
            },
            include: {
              technician: {
                select: { id: true, name: true },
              },
              order: {
                select: {
                  id: true,
                  orderNo: true,
                  customer: {
                    select: { name: true },
                  },
                },
              },
            },
          });

      if (orderId && order) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            technicianId,
            preferredDate: orderAppointment.preferredDate,
            preferredTime: orderAppointment.preferredTime,
            status:
              order.status === "NEW" ||
              order.status === "CONFIRMED"
                ? "ASSIGNED"
                : undefined,
          },
        });
      }

      return savedSlot;
    });

    await audit({
      orderId: orderId || undefined,
      actorId: actor.id,
      actorLabel: actor.name,
      action: "TECHNICIAN_SLOT_CREATED",
      oldValue: oldSlot
        ? {
            slotId: oldSlot.id,
            technicianId: oldSlot.technicianId,
            startsAt: oldSlot.startsAt.toISOString(),
            endsAt: oldSlot.endsAt.toISOString(),
          }
        : undefined,
      newValue: {
        slotId: slot.id,
        technicianId,
        technicianName: technician.name,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        preferredDate: orderAppointment.preferredDate,
        preferredTime: orderAppointment.preferredTime,
      },
    });

    if (order && order.technicianId !== technicianId) {
      await notifyAdmins({
        type: AdminNotificationType.TECHNICIAN_ASSIGNMENT,
        title: `تعيين فني من الجدول — ${order.orderNo}`,
        message: `الفني: ${technician.name}`,
        orderId: order.id,
        href: `/admin/orders/${order.id}`,
      });
    }

    return NextResponse.json(slot, {
      status: oldSlot ? 200 : 201,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "تعذر إنشاء الموعد" },
      {
        status:
          error.message === "UNAUTHENTICATED"
            ? 401
            : error.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
