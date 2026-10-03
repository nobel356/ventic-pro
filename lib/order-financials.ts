function moneyNumber(value: unknown) {
  return Number(value || 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function calculateOrderFinancials(
  client: any,
  orderId: string,
) {
  const order = await client.order.findUnique({
    where: { id: orderId },
    include: {
      venticEstimates: {
        where: { status: "ACCEPTED" },
        orderBy: { version: "desc" },
        take: 1,
      },
      quotes: {
        where: { status: "ACCEPTED" },
        orderBy: { respondedAt: "desc" },
        take: 1,
      },
      extraCharges: {
        where: { status: "APPROVED" },
      },
      payments: {
        where: { status: "PAID" },
      },
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const estimate = order.venticEstimates[0] || null;
  const legacyQuote = order.quotes[0] || null;

  let baseSubtotal = 0;
  let discount = 0;
  let baseTotal = 0;
  let source = "ESTIMATE";

  if (estimate) {
    baseSubtotal = moneyNumber(estimate.subtotal);
    discount = moneyNumber(estimate.discount);
    baseTotal = moneyNumber(estimate.total);
    source = `VENTIC_ESTIMATE_V${estimate.version}`;
  } else if (legacyQuote) {
    baseSubtotal = moneyNumber(legacyQuote.amount);
    baseTotal = moneyNumber(legacyQuote.amount);
    source = "LEGACY_QUOTE";
  } else {
    const fallback = moneyNumber(
      order.estimatedTotal ?? order.finalTotal ?? 0,
    );
    baseSubtotal = fallback;
    baseTotal = fallback;
    source = order.estimatedTotal
      ? "CUSTOMER_ESTIMATE"
      : "FINAL_TOTAL";
  }

  const approvedExtras = order.extraCharges.reduce(
    (sum: number, item: any) => sum + moneyNumber(item.amount),
    0,
  );

  const paid = order.payments.reduce(
    (sum: number, item: any) => sum + moneyNumber(item.amount),
    0,
  );

  const subtotal = roundMoney(baseSubtotal + approvedExtras);
  const total = roundMoney(baseTotal + approvedExtras);
  const due = roundMoney(Math.max(0, total - paid));

  return {
    orderId,
    source,
    authoritative: Boolean(estimate || legacyQuote),
    baseSubtotal: roundMoney(baseSubtotal),
    approvedExtras: roundMoney(approvedExtras),
    subtotal,
    discount: roundMoney(discount),
    total,
    paid: roundMoney(paid),
    due,
    acceptedEstimateId: estimate?.id || null,
    acceptedEstimateVersion: estimate?.version || null,
  };
}

export async function syncOrderInvoice(
  client: any,
  orderId: string,
) {
  const financials = await calculateOrderFinancials(client, orderId);

  if (!financials.authoritative) {
    throw new Error("QUOTE_NOT_ACCEPTED");
  }

  const existing = await client.invoice.findUnique({
    where: { orderId },
  });

  const invoiceNo =
    existing?.invoiceNo ||
    `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

  const invoice = await client.invoice.upsert({
    where: { orderId },
    update: {
      subtotal: financials.subtotal,
      discount: financials.discount,
      total: financials.total,
      paid: financials.paid,
      due: financials.due,
    },
    create: {
      invoiceNo,
      orderId,
      subtotal: financials.subtotal,
      discount: financials.discount,
      total: financials.total,
      paid: financials.paid,
      due: financials.due,
    },
  });

  await client.order.update({
    where: { id: orderId },
    data: { finalTotal: financials.total },
  });

  return { invoice, financials };
}
