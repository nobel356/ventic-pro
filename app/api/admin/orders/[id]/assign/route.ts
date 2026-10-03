import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/admin-notifications";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { parsePreferredAppointment } from "@/lib/order-appointment";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission(PERMISSIONS.ASSIGN_TECH);
    const { id } = await params;
    const { technicianId } = await req.json();

    const tech = await prisma.user.findFirst({
      where: {
        id: String(technicianId || ""),
        role: "TECHNICIAN",
        active: true,
      },
    });

    if (!tech) {
      return NextResponse.json(
        { error: "الفني غير موجود أو غير نشط" },
        { status: 404 },
      );
    }

    const old = await prisma.order.findUnique({
      where: { id },
      include: { technician: true },
    });

    if (!old) {
      return NextResponse.json(
        { error: "الطلب غير موجود" },
        { status: 404 },
      );
    }

    if (old.status === "COMPLETED" || old.status === "CANCELLED") {
      return NextResponse.json(
        { error: "لا يمكن تعيين فني لطلب مكتمل أو ملغي" },
        { status: 400 },
      );
    }

    const appointment = parsePreferredAppointment(
      old.preferredDate,
      old.preferredTime,
    );

    if (!appointment) {
      return NextResponse.json(
        {
          error:
            "الطلب ليس به موعد صالح. افتح تفاصيل الطلب وحدد التاريخ والفترة أولًا.",
        },
        { status: 400 },
      );
    }

    const clash = await prisma.technicianSlot.findFirst({
      where: {
        technicianId: tech.id,
        startsAt: { lt: appointment.endsAt },
        endsAt: { gt: appointment.startsAt },
        NOT: { orderId: id },
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
          error: `الفني لديه موعد متعارض${
            clash.order?.orderNo
              ? ` مع الطلب ${clash.order.orderNo}`
              : ""
          }. اختر فنيًا آخر أو غيّر الموعد.`,
        },
        { status: 409 },
      );
    }

    const oldSlot = await prisma.technicianSlot.findFirst({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    const result = await prisma.$transaction(async (tx) => {
      const slot = oldSlot
        ? await tx.technicianSlot.update({
            where: { id: oldSlot.id },
            data: {
              technicianId: tech.id,
              startsAt: appointment.startsAt,
              endsAt: appointment.endsAt,
            },
          })
        : await tx.technicianSlot.create({
            data: {
              technicianId: tech.id,
              orderId: id,
              startsAt: appointment.startsAt,
              endsAt: appointment.endsAt,
            },
          });

      const order = await tx.order.update({
        where: { id },
        data: {
          technicianId: tech.id,
          status:
            old.status === "NEW" || old.status === "CONFIRMED"
              ? "ASSIGNED"
              : old.status,
        },
      });

      return { order, slot };
    });

    await audit({
      orderId: id,
      actorId: actor.id,
      actorLabel: actor.name,
      action: "TECHNICIAN_ASSIGNED",
      oldValue: {
        technicianId: old.technicianId,
        technicianName: old.technician?.name,
        slotId: oldSlot?.id || null,
        startsAt: oldSlot?.startsAt?.toISOString() || null,
        endsAt: oldSlot?.endsAt?.toISOString() || null,
      },
      newValue: {
        technicianId: tech.id,
        technicianName: tech.name,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        slotId: result.slot.id,
      },
    });

    await notifyAdmins({
      type: AdminNotificationType.TECHNICIAN_ASSIGNMENT,
      title: `تم تعيين فني للطلب ${old.orderNo}`,
      message: `${tech.name} — تم ربط الموعد تلقائيًا بجدول الفنيين`,
      orderId: id,
      href: `/admin/orders/${id}`,
    });

    return NextResponse.json({
      ...result.order,
      appointmentCreated: !oldSlot,
      appointmentUpdated: Boolean(oldSlot),
      slotId: result.slot.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "تعذر تعيين الفني" },
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
