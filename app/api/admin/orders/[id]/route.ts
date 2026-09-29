import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/admin-notifications";

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
  const { id } = await params;
  const body = await req.json();

  if (body.status && !allowed.includes(body.status)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }

  const old = await prisma.order.findUnique({ where: { id } });
  if (!old) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: body.status,
      technicianId: body.technicianId || undefined,
    },
    include: { customer: true, technician: true },
  });

  await audit({
    orderId: id,
    actorLabel: "Admin",
    action: "ORDER_STATUS_CHANGED",
    oldValue: { status: old.status },
    newValue: { status: order.status },
  });

  if (body.status && old.status !== order.status) {
    await notifyAdmins({
      type: AdminNotificationType.ORDER_STATUS,
      title: `تحديث حالة ${order.orderNo}`,
      message: `${statusLabels[old.status] || old.status} ← ${statusLabels[order.status] || order.status}`,
      orderId: order.id,
      href: `/admin/orders/${order.id}`,
    });
  }

  return NextResponse.json(order);
}
