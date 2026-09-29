import { AdminNotificationType, PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-v7";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/admin-notifications";

const paymentMethods = new Set(Object.values(PaymentMethod));

export async function POST(req: Request) {
  try {
    const user = await requirePermission("orders.edit");
    const { orderId, amount, method, reference } = await req.json();
    const numericAmount = Number(amount);

    if (!orderId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "بيانات الدفع غير صحيحة" }, { status: 400 });
    }
    if (!paymentMethods.has(method as PaymentMethod)) {
      return NextResponse.json({ error: "طريقة الدفع غير صحيحة" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNo: true },
    });
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount: numericAmount,
        method,
        reference,
        receivedById: user.id,
      },
    });

    const paid = await prisma.payment.aggregate({
      where: { orderId, status: "PAID" },
      _sum: { amount: true },
    });
    const invoice = await prisma.invoice.findUnique({ where: { orderId } });
    if (invoice) {
      const paidTotal = Number(paid._sum.amount || 0);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paid: paidTotal,
          due: Math.max(0, Number(invoice.total) - paidTotal),
        },
      });
    }

    await audit({
      orderId,
      actorId: user.id,
      actorLabel: user.name,
      action: "PAYMENT_RECORDED",
      newValue: { amount: numericAmount, method, reference: reference || null },
    });

    await notifyAdmins({
      type: AdminNotificationType.PAYMENT,
      title: `تم تسجيل دفعة — ${order.orderNo}`,
      message: `تم تسجيل ${numericAmount.toLocaleString("ar-EG")} ج بطريقة ${method}.`,
      orderId,
      href: `/admin/orders/${orderId}`,
      dedupeKey: `payment:${payment.id}`,
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    const status = error?.message === "UNAUTHENTICATED" ? 401 : error?.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error?.message || "تعذر تسجيل الدفع" }, { status });
  }
}
