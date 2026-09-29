import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function moneyNumber(value: unknown) {
  return Number(value || 0);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const estimate = await prisma.venticEstimate.findUnique({
    where: { customerToken: token },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      order: { select: { orderNo: true } },
    },
  });

  if (estimate) {
    return NextResponse.json({
      type: "venticEstimate",
      id: estimate.id,
      orderNo: estimate.order.orderNo,
      version: estimate.version,
      status: estimate.status,
      subtotal: moneyNumber(estimate.subtotal),
      discount: moneyNumber(estimate.discount),
      total: moneyNumber(estimate.total),
      notes: estimate.notes,
      sentAt: estimate.sentAt,
      respondedAt: estimate.respondedAt,
      items: estimate.items.map((item) => ({
        id: item.id,
        description: item.description,
        unit: item.unit,
        qty: moneyNumber(item.qty),
        unitPrice: moneyNumber(item.unitPrice),
        total: moneyNumber(item.total),
      })),
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

  const extra = await prisma.extraCharge.findUnique({
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

  return NextResponse.json({ error: "الرابط غير صالح" }, { status: 404 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { decision } = await req.json();

  if (decision !== "accept" && decision !== "reject") {
    return NextResponse.json({ error: "قرار غير صالح" }, { status: 400 });
  }

  const accepted = decision === "accept";

  const estimate = await prisma.venticEstimate.findUnique({
    where: { customerToken: token },
    include: { items: true },
  });

  if (estimate) {
    if (estimate.status !== "SENT") {
      return NextResponse.json(
        { error: "تم الرد على هذه المقايسة بالفعل" },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      if (accepted) {
        await tx.venticEstimate.updateMany({
          where: {
            orderId: estimate.orderId,
            status: "ACCEPTED",
            NOT: { id: estimate.id },
          },
          data: { status: "SUPERSEDED" },
        });

        await tx.venticEstimate.update({
          where: { id: estimate.id },
          data: {
            status: "ACCEPTED",
            respondedAt: new Date(),
          },
        });

        await tx.order.update({
          where: { id: estimate.orderId },
          data: { finalTotal: estimate.total },
        });

        const paidAggregate = await tx.payment.aggregate({
          where: { orderId: estimate.orderId, status: "PAID" },
          _sum: { amount: true },
        });
        const paid = moneyNumber(paidAggregate._sum.amount);
        const total = moneyNumber(estimate.total);
        const subtotal = moneyNumber(estimate.subtotal);
        const discount = moneyNumber(estimate.discount);
        const due = Math.max(0, total - paid);

        const existingInvoice = await tx.invoice.findUnique({
          where: { orderId: estimate.orderId },
        });

        if (existingInvoice) {
          await tx.invoice.update({
            where: { orderId: estimate.orderId },
            data: {
              subtotal,
              discount,
              total,
              paid,
              due,
            },
          });
        } else {
          const invoiceNo = `INV-${new Date().getFullYear()}-${Date.now()
            .toString()
            .slice(-8)}`;
          await tx.invoice.create({
            data: {
              invoiceNo,
              orderId: estimate.orderId,
              subtotal,
              discount,
              total,
              paid,
              due,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            orderId: estimate.orderId,
            actorLabel: "العميل",
            action: "VENTIC_ESTIMATE_ACCEPTED",
            newValue: {
              estimateId: estimate.id,
              version: estimate.version,
              total,
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
            action: "VENTIC_ESTIMATE_REJECTED",
            newValue: {
              estimateId: estimate.id,
              version: estimate.version,
            },
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      type: "venticEstimate",
      decision,
    });
  }

  const quote = await prisma.quote.findUnique({
    where: { customerToken: token },
  });

  if (quote) {
    if (quote.status !== "SENT") {
      return NextResponse.json(
        { error: "تم الرد على عرض السعر بالفعل" },
        { status: 409 },
      );
    }

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: accepted ? "ACCEPTED" : "REJECTED",
        respondedAt: new Date(),
      },
    });

    if (accepted) {
      await prisma.order.update({
        where: { id: quote.orderId },
        data: { finalTotal: quote.amount },
      });
    }

    return NextResponse.json({ ok: true, type: "quote" });
  }

  const extra = await prisma.extraCharge.findUnique({
    where: { customerToken: token },
  });

  if (extra) {
    if (extra.status !== "PENDING") {
      return NextResponse.json(
        { error: "تم الرد على التكلفة الإضافية بالفعل" },
        { status: 409 },
      );
    }

    await prisma.extraCharge.update({
      where: { id: extra.id },
      data: {
        status: accepted ? "APPROVED" : "REJECTED",
        respondedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, type: "extra" });
  }

  return NextResponse.json({ error: "الرابط غير صالح" }, { status: 404 });
}
