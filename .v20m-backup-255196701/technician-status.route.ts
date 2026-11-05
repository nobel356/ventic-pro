import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentTechnician } from "@/lib/technician";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/admin-notifications";
import { notifyCustomer } from "@/lib/customer-notifications";

const allowed = ["ON_THE_WAY", "ARRIVED", "IN_PROGRESS"];
const labels: Record<string, string> = {
  ASSIGNED: "تم التعيين",
  ON_THE_WAY: "في الطريق",
  ARRIVED: "وصل",
  IN_PROGRESS: "جاري التنفيذ",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tech = await currentTechnician();
  if (!tech) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();

  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: "الحالة غير متاحة للفني" },
      { status: 400 },
    );
  }

  const old = await prisma.order.findFirst({
    where: { id, technicianId: tech.id },
    include: { customer: true },
  });
  if (!old) {
    return NextResponse.json(
      { error: "الطلب غير مسند لهذا الفني" },
      { status: 403 },
    );
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: status as any },
  });

  await audit({
    orderId: id,
    actorId: tech.id,
    actorLabel: tech.name,
    action: "TECHNICIAN_STATUS_CHANGED",
    oldValue: { status: old.status },
    newValue: { status },
  });

  await notifyAdmins({
    type: AdminNotificationType.ORDER_STATUS,
    title: `تحديث من الفني — ${order.orderNo}`,
    message: `${tech.name}: ${labels[status] || status}`,
    orderId: order.id,
    href: `/admin/orders/${order.id}`,
  });

  await notifyCustomer({
    orderId: order.id,
    customerId: old.customer.id,
    phone: old.customer.phone,
    templateKey:
      status === "ON_THE_WAY"
        ? "TECHNICIAN_ON_THE_WAY"
        : "ORDER_STATUS",
    templateVariables:
      status === "ON_THE_WAY"
        ? [
            order.orderNo,
            tech.name,
          ]
        : [
            order.orderNo,
            labels[status] || status,
          ],
    subject: `تحديث الطلب ${order.orderNo}`,
    message:
      status === "ON_THE_WAY"
        ? `Ventic Pro\nالفني ${tech.name} في الطريق إليك لتنفيذ الطلب ${order.orderNo}.`
        : `Ventic Pro\nتحديث الطلب ${order.orderNo}: ${labels[status] || status}.`,
    payload: {
      technicianName: tech.name,
      status,
    },
  });

  return NextResponse.json(order);
}
