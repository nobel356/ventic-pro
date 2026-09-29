import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/admin-notifications";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { technicianId } = await req.json();

  const tech = await prisma.user.findFirst({
    where: { id: technicianId, role: "TECHNICIAN", active: true },
  });
  if (!tech) {
    return NextResponse.json({ error: "الفني غير موجود" }, { status: 404 });
  }

  const old = await prisma.order.findUnique({
    where: { id },
    include: { technician: true },
  });
  if (!old) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { technicianId, status: "ASSIGNED" },
  });

  await audit({
    orderId: id,
    actorLabel: "Admin",
    action: "TECHNICIAN_ASSIGNED",
    oldValue: {
      technicianId: old.technicianId,
      technicianName: old.technician?.name,
    },
    newValue: { technicianId: tech.id, technicianName: tech.name },
  });

  await notifyAdmins({
    type: AdminNotificationType.TECHNICIAN_ASSIGNMENT,
    title: `تم تعيين فني للطلب ${old.orderNo}`,
    message: `الفني: ${tech.name}`,
    orderId: id,
    href: `/admin/orders/${id}`,
  });

  return NextResponse.json(updated);
}
