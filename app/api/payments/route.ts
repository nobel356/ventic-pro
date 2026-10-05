import {
  AdminNotificationType,
  PaymentMethod,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { notifyAdmins } from "@/lib/admin-notifications";
import { notifyCustomer } from "@/lib/customer-notifications";
import {
  calculateOrderFinancials,
  syncOrderInvoice,
} from "@/lib/order-financials";

const paymentMethods = new Set(
  Object.values(PaymentMethod),
);

export async function POST(req: Request) {
  try {
    const user =
      await requirePermission(
        PERMISSIONS.PAYMENTS_MANAGE,
      );
    const {
      orderId,
      amount,
      method,
      reference,
    } = await req.json();

    const numericAmount =
      Number(amount);

    if (
      !orderId ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return NextResponse.json(
        { error: "بيانات الدفع غير صحيحة" },
        { status: 400 },
      );
    }

    if (
      !paymentMethods.has(
        method as PaymentMethod,
      )
    ) {
      return NextResponse.json(
        { error: "طريقة الدفع غير صحيحة" },
        { status: 400 },
      );
    }

    const order =
      await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
        },
      });

    if (!order) {
      return NextResponse.json(
        { error: "الطلب غير موجود" },
        { status: 404 },
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const beforePayment =
            await calculateOrderFinancials(
              tx,
              orderId,
            );

          if (
            beforePayment.total > 0 &&
            numericAmount >
              beforePayment.due +
                0.009
          ) {
            throw new Error(
              "OVERPAYMENT",
            );
          }

          const payment =
            await tx.payment.create({
              data: {
                orderId,
                amount:
                  numericAmount,
                method,
                reference:
                  String(
                    reference ||
                      "",
                  ).trim() ||
                  null,
                receivedById:
                  user.id,
              },
            });

          const finance =
            beforePayment.authoritative
              ? await syncOrderInvoice(
                  tx,
                  orderId,
                )
              : {
                  invoice: null,
                  financials:
                    await calculateOrderFinancials(
                      tx,
                      orderId,
                    ),
                };

          await tx.auditLog.create({
            data: {
              orderId,
              actorId: user.id,
              actorLabel:
                user.name,
              action:
                "PAYMENT_RECORDED",
              newValue: {
                paymentId:
                  payment.id,
                amount:
                  numericAmount,
                method,
                reference:
                  String(
                    reference ||
                      "",
                  ).trim() ||
                  null,
                invoiceId:
                  finance
                    .invoice?.id ||
                  null,
                paidAfter:
                  finance
                    .financials
                    .paid,
                dueAfter:
                  finance
                    .financials
                    .due,
              },
            },
          });

          return {
            payment,
            finance,
          };
        },
        {
          isolationLevel:
            "Serializable",
        },
      );

    await notifyAdmins({
      type:
        AdminNotificationType.PAYMENT,
      title: `تم تسجيل دفعة — ${order.orderNo}`,
      message: `تم تسجيل ${numericAmount.toLocaleString(
        "ar-EG",
      )} ج. المتبقي الآن ${result.finance.financials.due.toLocaleString(
        "ar-EG",
      )} ج.`,
      orderId,
      href: `/admin/orders/${orderId}`,
      dedupeKey: `payment:${result.payment.id}`,
    });

    await notifyCustomer({
      orderId,
      customerId:
        order.customer.id,
      phone:
        order.customer.phone,
      templateKey:
        "PAYMENT_RECEIVED",
      templateVariables: [
        order.orderNo,
        numericAmount.toLocaleString(
          "ar-EG",
        ),
        result.finance.financials.due.toLocaleString(
          "ar-EG",
        ),
      ],
      subject:
        `تم تسجيل دفعة للطلب ${order.orderNo}`,
      message:
        `Ventic Pro\nتم تسجيل دفعة بقيمة ${numericAmount.toLocaleString("ar-EG")} ج ` +
        `للطلب ${order.orderNo}. المتبقي ${result.finance.financials.due.toLocaleString("ar-EG")} ج.`,
      payload: {
        paymentId:
          result.payment.id,
        amount:
          numericAmount,
        due:
          result.finance
            .financials.due,
      },
    });

    return NextResponse.json({
      payment: result.payment,
      invoice:
        result.finance.invoice,
      financials:
        result.finance
          .financials,
    });
  } catch (error: any) {
    if (
      error?.message ===
      "OVERPAYMENT"
    ) {
      return NextResponse.json(
        {
          error:
            "قيمة الدفعة أكبر من المبلغ المتبقي.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر تسجيل الدفع",
      },
      {
        status:
          error?.message ===
          "UNAUTHENTICATED"
            ? 401
            : error?.message ===
                "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
