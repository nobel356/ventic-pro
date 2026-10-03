import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/admin-notifications";
import {
  calculateOrderFinancials,
  syncOrderInvoice,
} from "@/lib/order-financials";

function moneyNumber(value: unknown) {
  return Number(value || 0);
}

function roundMoney(value: number) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ token: string }>;
  },
) {
  const { token } = await params;

  const estimate =
    await prisma.venticEstimate.findUnique({
      where: { customerToken: token },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        order: {
          select: { orderNo: true },
        },
      },
    });

  if (estimate) {
    return NextResponse.json({
      type: "venticEstimate",
      id: estimate.id,
      orderNo: estimate.order.orderNo,
      version: estimate.version,
      status: estimate.status,
      subtotal: moneyNumber(
        estimate.subtotal,
      ),
      discount: moneyNumber(
        estimate.discount,
      ),
      total: moneyNumber(estimate.total),
      notes: estimate.notes,
      sentAt: estimate.sentAt,
      respondedAt: estimate.respondedAt,
      items: estimate.items.map((item) => {
        const qty = moneyNumber(item.qty);
        const unitPrice = moneyNumber(
          item.unitPrice,
        );

        return {
          id: item.id,
          description: item.description,
          unit: item.unit,
          qty,
          unitPrice,
          lineTotal: roundMoney(
            qty * unitPrice,
          ),
        };
      }),
    });
  }

  const quote = await prisma.quote.findUnique({
    where: { customerToken: token },
  });

  if (quote) {
    return NextResponse.json({
      type: "quote",
      status: quote.status,
      amount: moneyNumber(quote.amount),
      notes: quote.notes,
    });
  }

  const extra =
    await prisma.extraCharge.findUnique({
      where: { customerToken: token },
    });

  if (extra) {
    return NextResponse.json({
      type: "extra",
      status: extra.status,
      title: extra.title,
      reason: extra.reason,
      amount: moneyNumber(extra.amount),
    });
  }

  return NextResponse.json(
    { error: "الرابط غير صالح" },
    { status: 404 },
  );
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ token: string }>;
  },
) {
  const { token } = await params;
  const { decision } = await req.json();

  if (
    decision !== "accept" &&
    decision !== "reject"
  ) {
    return NextResponse.json(
      { error: "قرار غير صالح" },
      { status: 400 },
    );
  }

  const accepted = decision === "accept";

  const estimate =
    await prisma.venticEstimate.findUnique({
      where: { customerToken: token },
      include: {
        items: true,
        order: {
          select: { orderNo: true },
        },
      },
    });

  if (estimate) {
    if (estimate.status !== "SENT") {
      return NextResponse.json(
        {
          error:
            "تم الرد على هذه المقايسة بالفعل",
        },
        { status: 409 },
      );
    }

    let synced: any = null;

    await prisma.$transaction(
      async (tx) => {
        if (accepted) {
          await tx.venticEstimate.updateMany({
            where: {
              orderId: estimate.orderId,
              status: "ACCEPTED",
              NOT: { id: estimate.id },
            },
            data: {
              status: "SUPERSEDED",
            },
          });

          await tx.venticEstimate.update({
            where: { id: estimate.id },
            data: {
              status: "ACCEPTED",
              respondedAt: new Date(),
            },
          });

          synced = await syncOrderInvoice(
            tx,
            estimate.orderId,
          );

          await tx.auditLog.create({
            data: {
              orderId: estimate.orderId,
              actorLabel: "العميل",
              action:
                "VENTIC_ESTIMATE_ACCEPTED",
              newValue: {
                estimateId: estimate.id,
                version: estimate.version,
                estimateTotal:
                  moneyNumber(
                    estimate.total,
                  ),
                approvedExtras:
                  synced.financials
                    .approvedExtras,
                finalTotal:
                  synced.financials.total,
                invoiceId:
                  synced.invoice.id,
              },
            },
          });
        } else {
          await tx.venticEstimate.update({
            where: { id: estimate.id },
            data: {
              status: "REJECTED",
              respondedAt: new Date(),
            },
          });

          await tx.auditLog.create({
            data: {
              orderId: estimate.orderId,
              actorLabel: "العميل",
              action:
                "VENTIC_ESTIMATE_REJECTED",
              newValue: {
                estimateId: estimate.id,
                version: estimate.version,
              },
            },
          });
        }
      },
      { isolationLevel: "Serializable" },
    );

    await notifyAdmins({
      type:
        AdminNotificationType.QUOTATION_RESPONSE,
      title: `${
        accepted
          ? "تمت الموافقة على"
          : "تم رفض"
      } مقايسة ${estimate.order.orderNo}`,
      message: accepted
        ? `العميل وافق على مقايسة Ventic Pro إصدار ${estimate.version}. إجمالي الفاتورة بعد الإضافات المعتمدة ${Number(
            synced?.financials?.total ||
              estimate.total,
          ).toLocaleString("ar-EG")} ج.`
        : `العميل رفض مقايسة Ventic Pro إصدار ${estimate.version}.`,
      orderId: estimate.orderId,
      href: `/admin/orders/${estimate.orderId}`,
      dedupeKey: `estimate-response:${estimate.id}`,
    });

    return NextResponse.json({
      ok: true,
      type: "venticEstimate",
      decision,
      financials:
        synced?.financials || null,
    });
  }

  const quote = await prisma.quote.findUnique({
    where: { customerToken: token },
    include: {
      order: {
        select: { orderNo: true },
      },
    },
  });

  if (quote) {
    if (quote.status !== "SENT") {
      return NextResponse.json(
        {
          error:
            "تم الرد على عرض السعر بالفعل",
        },
        { status: 409 },
      );
    }

    let synced: any = null;

    await prisma.$transaction(
      async (tx) => {
        await tx.quote.update({
          where: { id: quote.id },
          data: {
            status: accepted
              ? "ACCEPTED"
              : "REJECTED",
            respondedAt: new Date(),
          },
        });

        if (accepted) {
          synced = await syncOrderInvoice(
            tx,
            quote.orderId,
          );
        }

        await tx.auditLog.create({
          data: {
            orderId: quote.orderId,
            actorLabel: "العميل",
            action: accepted
              ? "LEGACY_QUOTE_ACCEPTED"
              : "LEGACY_QUOTE_REJECTED",
            newValue: {
              quoteId: quote.id,
              amount: moneyNumber(
                quote.amount,
              ),
              finalTotal:
                synced?.financials?.total ||
                null,
            },
          },
        });
      },
      { isolationLevel: "Serializable" },
    );

    await notifyAdmins({
      type:
        AdminNotificationType.QUOTATION_RESPONSE,
      title: `${
        accepted
          ? "تمت الموافقة على"
          : "تم رفض"
      } عرض ${quote.order.orderNo}`,
      message: `العميل ${
        accepted ? "وافق على" : "رفض"
      } عرض السعر بقيمة ${moneyNumber(
        quote.amount,
      ).toLocaleString("ar-EG")} ج.`,
      orderId: quote.orderId,
      href: `/admin/orders/${quote.orderId}`,
      dedupeKey: `quote-response:${quote.id}`,
    });

    return NextResponse.json({
      ok: true,
      type: "quote",
      decision,
      financials:
        synced?.financials || null,
    });
  }

  const extra =
    await prisma.extraCharge.findUnique({
      where: { customerToken: token },
      include: {
        order: {
          select: {
            orderNo: true,
          },
        },
      },
    });

  if (extra) {
    if (extra.status !== "PENDING") {
      return NextResponse.json(
        {
          error:
            "تم الرد على التكلفة الإضافية بالفعل",
        },
        { status: 409 },
      );
    }

    let synced: any = null;

    await prisma.$transaction(
      async (tx) => {
        await tx.extraCharge.update({
          where: { id: extra.id },
          data: {
            status: accepted
              ? "APPROVED"
              : "REJECTED",
            respondedAt: new Date(),
          },
        });

        if (accepted) {
          const current = await calculateOrderFinancials(
            tx,
            extra.orderId,
          );

          if (current.authoritative) {
            synced = await syncOrderInvoice(
              tx,
              extra.orderId,
            );
          }
        }

        await tx.auditLog.create({
          data: {
            orderId: extra.orderId,
            actorLabel: "العميل",
            action: accepted
              ? "EXTRA_CHARGE_ACCEPTED"
              : "EXTRA_CHARGE_REJECTED",
            newValue: {
              extraChargeId: extra.id,
              title: extra.title,
              amount: moneyNumber(
                extra.amount,
              ),
              finalTotal:
                synced?.financials?.total ||
                null,
              invoiceId:
                synced?.invoice?.id || null,
            },
          },
        });
      },
      { isolationLevel: "Serializable" },
    );

    await notifyAdmins({
      type:
        AdminNotificationType.EXTRA_CHARGE_RESPONSE,
      title: `${
        accepted
          ? "تم قبول"
          : "تم رفض"
      } تكلفة إضافية — ${extra.order.orderNo}`,
      message: accepted
        ? `العميل وافق على ${extra.title} بقيمة ${moneyNumber(
            extra.amount,
          ).toLocaleString(
            "ar-EG",
          )} ج${synced ? " وتم تحديث الفاتورة تلقائيًا." : " وستدخل تلقائيًا في الفاتورة عند اعتماد المقايسة."}`
        : `العميل رفض ${extra.title} بقيمة ${moneyNumber(
            extra.amount,
          ).toLocaleString("ar-EG")} ج.`,
      orderId: extra.orderId,
      href: `/admin/orders/${extra.orderId}`,
      dedupeKey: `extra-response:${extra.id}`,
    });

    return NextResponse.json({
      ok: true,
      type: "extra",
      decision,
      financials:
        synced?.financials || null,
    });
  }

  return NextResponse.json(
    { error: "الرابط غير صالح" },
    { status: 404 },
  );
}
