import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/admin-notifications";
import { PERMISSIONS, requirePermission } from "@/lib/auth-v7";
import { parsePreferredAppointment } from "@/lib/order-appointment";

const allowed = [
  "NEW",
  "CONFIRMED",
  "ASSIGNED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const statusLabels: Record<string, string> = {
  NEW: "جديد",
  CONFIRMED: "تم التأكيد",
  ASSIGNED: "تم تعيين فني",
  ON_THE_WAY: "في الطريق",
  ARRIVED: "وصل",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission(PERMISSIONS.ORDERS_EDIT);
    const { id } = await params;
    const body = await req.json();

    if (body.status && !allowed.includes(body.status)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }

    const old = await prisma.order.findUnique({
      where: { id },
      include: { customer: true, technician: true },
    });

    if (!old) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    if (body.status === "COMPLETED" && old.status !== "COMPLETED") {
      return NextResponse.json(
        {
          error:
            "إتمام الطلب يتم من شاشة الفني بعد صور قبل/بعد وتأكيد الخامات وكود العميل؛ وقتها الفاتورة والضمان يتحدثان تلقائيًا.",
        },
        { status: 409 },
      );
    }

    if (old.status === "COMPLETED") {
      return NextResponse.json(
        { error: "الطلب مكتمل ومغلق تشغيليًا ولا يتم تغيير حالته أو موعده مباشرة." },
        { status: 409 },
      );
    }

    const hasPreferredDate = Object.prototype.hasOwnProperty.call(
      body,
      "preferredDate",
    );
    const hasPreferredTime = Object.prototype.hasOwnProperty.call(
      body,
      "preferredTime",
    );

    const nextDate = hasPreferredDate
      ? String(body.preferredDate || "").trim()
      : old.preferredDate;
    const nextTime = hasPreferredTime
      ? String(body.preferredTime || "").trim()
      : old.preferredTime;

    const appointmentChanged =
      nextDate !== old.preferredDate || nextTime !== old.preferredTime;
    const nextStatus = body.status || old.status;
    const terminal = nextStatus === "CANCELLED" || nextStatus === "COMPLETED";

    const appointment =
      appointmentChanged && old.technicianId && !terminal
        ? parsePreferredAppointment(nextDate, nextTime)
        : null;

    if (
      appointmentChanged &&
      old.technicianId &&
      !terminal &&
      !appointment
    ) {
      return NextResponse.json(
        { error: "التاريخ أو فترة الموعد غير صالحة" },
        { status: 400 },
      );
    }

    if (appointment && old.technicianId) {
      const clash = await prisma.technicianSlot.findFirst({
        where: {
          technicianId: old.technicianId,
          startsAt: { lt: appointment.endsAt },
          endsAt: { gt: appointment.startsAt },
          NOT: { orderId: id },
          OR: [
            { orderId: null },
            { order: { status: { notIn: ["COMPLETED", "CANCELLED"] } } },
          ],
        },
        include: { order: { select: { orderNo: true } } },
      });

      if (clash) {
        return NextResponse.json(
          {
            error: `الفني لديه موعد متعارض${
              clash.order?.orderNo ? ` مع الطلب ${clash.order.orderNo}` : ""
            }. اختر موعدًا آخر.`,
          },
          { status: 409 },
        );
      }
    }

    const oldSlot =
      appointmentChanged && old.technicianId
        ? await prisma.technicianSlot.findFirst({
            where: { orderId: id },
            orderBy: { createdAt: "desc" },
          })
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: {
          status: body.status || undefined,
          preferredDate: hasPreferredDate ? nextDate || null : undefined,
          preferredTime: hasPreferredTime ? nextTime || null : undefined,
        },
        include: { customer: true, technician: true },
      });

      let slotId: string | null = null;

      if (appointmentChanged && old.technicianId && appointment && !terminal) {
        const slot = oldSlot
          ? await tx.technicianSlot.update({
              where: { id: oldSlot.id },
              data: {
                technicianId: old.technicianId,
                startsAt: appointment.startsAt,
                endsAt: appointment.endsAt,
              },
            })
          : await tx.technicianSlot.create({
              data: {
                technicianId: old.technicianId,
                orderId: id,
                startsAt: appointment.startsAt,
                endsAt: appointment.endsAt,
              },
            });
        slotId = slot.id;
      }

      return { order, slotId };
    });

    if (body.status && old.status !== result.order.status) {
      await audit({
        orderId: id,
        actorId: actor.id,
        actorLabel: actor.name,
        action: "ORDER_STATUS_CHANGED",
        oldValue: { status: old.status },
        newValue: { status: result.order.status },
      });
      await notifyAdmins({
        type: AdminNotificationType.ORDER_STATUS,
        title: `تحديث حالة ${result.order.orderNo}`,
        message: `${statusLabels[old.status] || old.status} ← ${
          statusLabels[result.order.status] || result.order.status
        }`,
        orderId: result.order.id,
        href: `/admin/orders/${result.order.id}`,
      });
    }

    if (appointmentChanged) {
      await audit({
        orderId: id,
        actorId: actor.id,
        actorLabel: actor.name,
        action: "ORDER_APPOINTMENT_CHANGED",
        oldValue: {
          preferredDate: old.preferredDate,
          preferredTime: old.preferredTime,
          slotId: oldSlot?.id || null,
          slotStartsAt: oldSlot?.startsAt?.toISOString() || null,
          slotEndsAt: oldSlot?.endsAt?.toISOString() || null,
        },
        newValue: {
          preferredDate: result.order.preferredDate,
          preferredTime: result.order.preferredTime,
          slotId: result.slotId,
          slotStartsAt: appointment?.startsAt.toISOString() || null,
          slotEndsAt: appointment?.endsAt.toISOString() || null,
        },
      });
      await notifyAdmins({
        type: AdminNotificationType.SYSTEM,
        title: `تم تحديث موعد ${result.order.orderNo}`,
        message: `${result.order.preferredDate || "-"} — ${result.order.preferredTime || "-"}`,
        orderId: result.order.id,
        href: `/admin/orders/${result.order.id}`,
      });
    }

    return NextResponse.json({ ...result.order, slotId: result.slotId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "تعذر تحديث الطلب" },
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
