import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentTechnician } from "@/lib/technician";
import { otpMatches } from "@/lib/otp";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/admin-notifications";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tech = await currentTechnician();
  if (!tech) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;
  const { otp } = await req.json();

  const order = await prisma.order.findFirst({
    where: { id, technicianId: tech.id },
  });
  if (!order) {
    return NextResponse.json(
      { error: "الطلب غير مسند لهذا الفني" },
      { status: 403 },
    );
  }

  const before = await prisma.attachment.count({
    where: { orderId: id, kind: "BEFORE" },
  });
  const after = await prisma.attachment.count({
    where: { orderId: id, kind: "AFTER" },
  });

  if (!before || !after) {
    return NextResponse.json(
      { error: "صور قبل وبعد مطلوبة" },
      { status: 400 },
    );
  }

  if (
    !order.completionOtpHash ||
    !order.completionOtpExpiresAt ||
    order.completionOtpExpiresAt < new Date() ||
    !otpMatches(id, String(otp), order.completionOtpHash)
  ) {
    return NextResponse.json(
      { error: "كود التأكيد غير صحيح أو منتهي" },
      { status: 400 },
    );
  }

  await prisma.order.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completionOtpHash: null,
      completionOtpExpiresAt: null,
    },
  });

  await audit({
    orderId: id,
    actorId: tech.id,
    actorLabel: tech.name,
    action: "ORDER_COMPLETED_WITH_OTP",
    oldValue: { status: order.status },
    newValue: { status: "COMPLETED" },
  });

  await notifyAdmins({
    type: AdminNotificationType.ORDER_COMPLETED,
    title: `تم إكمال الطلب ${order.orderNo}`,
    message: `الفني ${tech.name} أنهى التركيب وتم تأكيده بكود العميل.`,
    orderId: order.id,
    href: `/admin/orders/${order.id}`,
  });

  return NextResponse.json({ ok: true });
}
