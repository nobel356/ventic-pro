import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-v7";
import { syncOrderInvoice } from "@/lib/order-financials";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const user = await requirePermission("orders.edit");
    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNo: true },
    });
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const synced = await syncOrderInvoice(tx, orderId);
        await tx.auditLog.create({
          data: {
            orderId,
            actorId: user.id,
            actorLabel: user.name,
            action: "INVOICE_SYNCED",
            newValue: {
              invoiceId: synced.invoice.id,
              subtotal: synced.financials.subtotal,
              discount: synced.financials.discount,
              approvedExtras: synced.financials.approvedExtras,
              total: synced.financials.total,
              paid: synced.financials.paid,
              due: synced.financials.due,
              source: synced.financials.source,
            },
          },
        });
        return synced;
      },
      { isolationLevel: "Serializable" },
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "QUOTE_NOT_ACCEPTED") {
      return NextResponse.json(
        { error: "لا يمكن إصدار فاتورة نهائية قبل اعتماد مقايسة Ventic Pro من العميل." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error.message || "تعذر مزامنة الفاتورة" },
      {
        status:
          error.message === "UNAUTHENTICATED"
            ? 401
            : error.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
