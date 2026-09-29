import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/admin-notifications";

export async function POST(req: Request) {
  const { orderId, issue, freeRevisit = false } = await req.json();
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

  const complaint = await prisma.complaint.create({
    data: {
      orderId,
      issue: String(issue).trim(),
      freeRevisit: Boolean(freeRevisit),
    },
  });

  await notifyAdmins({
    type: AdminNotificationType.COMPLAINT,
    title: `شكوى جديدة — ${order.orderNo}`,
    message: `${order.customer.name}: ${String(issue).trim()}`,
    orderId,
    href: "/admin/aftercare",
    dedupeKey: `complaint:${complaint.id}`,
  });

  return NextResponse.json(complaint);
}
