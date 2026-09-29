import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/admin-notifications";

export async function POST(req: Request) {
  const { orderId, warrantyId, issue } = await req.json();
  if (!orderId || !String(issue || "").trim()) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNo: true, customer: { select: { name: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const request = await prisma.maintenanceRequest.create({
    data: { orderId, warrantyId: warrantyId || null, issue: String(issue).trim() },
  });

  await notifyAdmins({
    type: AdminNotificationType.MAINTENANCE_REQUEST,
    title: `طلب صيانة جديد — ${order.orderNo}`,
    message: `${order.customer.name}: ${String(issue).trim()}`,
    orderId,
    href: "/admin/aftercare",
    dedupeKey: `maintenance:${request.id}`,
  });

  return NextResponse.json(request);
}
