import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentTechnician } from "@/lib/technician";
import { otpMatches } from "@/lib/otp";
import { notifyAdmins } from "@/lib/admin-notifications";
import { getOrderMaterialState } from "@/lib/order-materials";
import {
  calculateOrderFinancials,
  syncOrderInvoice,
} from "@/lib/order-financials";

function warrantyDays() {
  const parsed = Number(process.env.DEFAULT_WARRANTY_DAYS || 365);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 365;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tech = await currentTechnician();
  if (!tech) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const { otp } = await req.json();

  const order = await prisma.order.findFirst({
    where: { id, technicianId: tech.id },
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
    return NextResponse.json({ error: "صور قبل وبعد مطلوبة" }, { status: 400 });
  }
  if (!materialState.confirmed) {
    return NextResponse.json(
      { error: "يجب تسجيل الخامات المستخدمة أو تأكيد عدم استخدام خامات" },
      { status: 400 },
    );
  }

  const financialState = await calculateOrderFinancials(
    prisma,
    id,
  );

  if (!financialState.authoritative) {
    return NextResponse.json(
      {
        error:
          "لا يمكن إتمام الطلب قبل اعتماد مقايسة Ventic Pro من العميل.",
      },
      { status: 409 },
    );
  }

  const expired =
    !order.completionOtpHash ||
    !order.completionOtpExpiresAt ||
    order.completionOtpExpiresAt < new Date();
  const invalid =
    !expired &&
    !otpMatches(id, String(otp), order.completionOtpHash!);

  if (expired || invalid) {
    const bucket = Math.floor(Date.now() / (10 * 60_000));
    await notifyAdmins({
      type: AdminNotificationType.OTP_ALERT,
      title: `${expired ? "كود إتمام منتهي" : "محاولة كود إتمام غير صحيحة"} — ${order.orderNo}`,
      message: `الفني ${tech.name} حاول إتمام الطلب ولم يتم اعتماد كود العميل.`,
      orderId: id,
      href: `/admin/orders/${id}`,
      dedupeKey: expired ? `otp-expired:${id}` : `otp-invalid:${id}:${bucket}`,
    });
    return NextResponse.json(
      { error: "كود التأكيد غير صحيح أو منتهي" },
      { status: 400 },
    );
  }

  const completedAt = new Date();
  const warrantyEndsAt = new Date(completedAt);
  warrantyEndsAt.setDate(warrantyEndsAt.getDate() + warrantyDays());

  const result = await prisma.$transaction(
    async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completionOtpHash: null,
          completionOtpExpiresAt: null,
        },
      });

      let warranty = await tx.warranty.findFirst({
        where: { orderId: id },
        orderBy: { createdAt: "desc" },
      });

      if (!warranty) {
        warranty = await tx.warranty.create({
          data: {
            orderId: id,
            startsAt: completedAt,
            endsAt: warrantyEndsAt,
            status: "ACTIVE",
            notes: `تم تفعيل الضمان تلقائيًا عند إتمام الطلب لمدة ${warrantyDays()} يوم.`,
          },
        });
        await tx.auditLog.create({
          data: {
            orderId: id,
            actorId: tech.id,
            actorLabel: tech.name,
            action: "WARRANTY_AUTO_CREATED",
            newValue: {
              warrantyId: warranty.id,
              startsAt: warranty.startsAt.toISOString(),
              endsAt: warranty.endsAt.toISOString(),
              days: warrantyDays(),
            },
          },
        });
      }

      const finance = await syncOrderInvoice(tx, id);

      await tx.auditLog.create({
        data: {
          orderId: id,
          actorId: tech.id,
          actorLabel: tech.name,
          action: "ORDER_COMPLETED_WITH_OTP",
          oldValue: { status: order.status },
          newValue: {
            status: "COMPLETED",
            materialUsageCount: materialState.usedMovements.length,
            materialsConfirmedNone: materialState.confirmedNone,
            invoiceId: finance.invoice.id,
            invoiceTotal: finance.financials.total,
            warrantyId: warranty.id,
          },
        },
      });

      return { warranty, finance };
    },
    { isolationLevel: "Serializable" },
  );

  await notifyAdmins({
    type: AdminNotificationType.ORDER_COMPLETED,
    title: `تم إكمال الطلب ${order.orderNo}`,
    message: `الفني ${tech.name} أنهى التركيب. تم مزامنة الفاتورة وتفعيل الضمان تلقائيًا.`,
    orderId: order.id,
    href: `/admin/orders/${order.id}`,
    dedupeKey: `order-completed:${order.id}`,
  });

  return NextResponse.json({
    ok: true,
    invoiceTotal: result.finance.financials.total,
    due: result.finance.financials.due,
    warrantyEndsAt: result.warranty.endsAt,
  });
}
