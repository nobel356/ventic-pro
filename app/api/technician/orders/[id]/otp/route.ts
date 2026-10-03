import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentTechnician } from "@/lib/technician";
import { newOtp, hashOtp } from "@/lib/otp";
import { audit } from "@/lib/audit";
import { getOrderMaterialState } from "@/lib/order-materials";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tech = await currentTechnician();
  if (!tech) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, technicianId: tech.id },
    include: { customer: true },
  });
  if (!order) {
    return NextResponse.json({ error: "الطلب غير مسند لهذا الفني" }, { status: 403 });
  }

  const [before, after, materialState] = await Promise.all([
    prisma.attachment.count({ where: { orderId: id, kind: "BEFORE" } }),
    prisma.attachment.count({ where: { orderId: id, kind: "AFTER" } }),
    getOrderMaterialState(prisma, id, tech.id),
  ]);

  if (!before || !after) {
    return NextResponse.json(
      { error: "يجب تسجيل صور قبل وبعد قبل إصدار كود الإغلاق" },
      { status: 400 },
    );
  }
  if (!materialState.confirmed) {
    return NextResponse.json(
      { error: "سجل الخامات المستخدمة أو أكد عدم استخدام خامات أولًا" },
      { status: 400 },
    );
  }

  const otp = newOtp();
  await prisma.order.update({
    where: { id },
    data: {
      completionOtpHash: hashOtp(id, otp),
      completionOtpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  await audit({
    orderId: id,
    actorId: tech.id,
    actorLabel: tech.name,
    action: "COMPLETION_OTP_ISSUED",
  });

  return NextResponse.json({
    message: "في الإنتاج يتم إرسال الكود للعميل عبر SMS/WhatsApp.",
    demoOtp: process.env.NODE_ENV === "production" ? undefined : otp,
  });
}
