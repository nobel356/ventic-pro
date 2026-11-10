import { prisma } from "@/lib/prisma";

export type GrowthMetricKey =
  | "lead_conversion_pct"
  | "completion_pct"
  | "collection_pct"
  | "order_attribution_pct"
  | "lead_attribution_pct"
  | "seo_score";

export const growthMetricDefinitions: Array<{
  key: GrowthMetricKey;
  label: string;
  defaultTarget: number;
  unit: string;
}> = [
  {
    key: "lead_conversion_pct",
    label: "Lead → Order Conversion",
    defaultTarget: 25,
    unit: "%",
  },
  {
    key: "completion_pct",
    label: "Order Completion",
    defaultTarget: 70,
    unit: "%",
  },
  {
    key: "collection_pct",
    label: "Collection Rate",
    defaultTarget: 80,
    unit: "%",
  },
  {
    key: "order_attribution_pct",
    label: "Order Attribution Coverage",
    defaultTarget: 90,
    unit: "%",
  },
  {
    key: "lead_attribution_pct",
    label: "Lead Attribution Coverage",
    defaultTarget: 90,
    unit: "%",
  },
  {
    key: "seo_score",
    label: "SEO Health Score",
    defaultTarget: 85,
    unit: "/100",
  },
];

function pct(value: number, total: number) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

export async function ensureGrowthTargets() {
  for (const item of growthMetricDefinitions) {
    await prisma.growthTarget.upsert({
      where: { key: item.key },
      update: {},
      create: {
        key: item.key,
        label: item.label,
        targetValue: item.defaultTarget,
        comparator: "GTE",
        active: true,
      },
    });
  }
}

export async function getGrowthTargets() {
  await ensureGrowthTargets();

  return prisma.growthTarget.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
  });
}

export async function getThirtyDayGrowthMetrics() {
  const since = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  );

  const [orders, leads] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: {
        status: true,
        attributionSource: true,
        invoice: { select: { total: true, paid: true } },
        finalTotal: true,
        estimatedTotal: true,
      },
    }),
    prisma.lead.findMany({
      where: { createdAt: { gte: since } },
      select: {
        status: true,
        convertedOrderId: true,
        attributionSource: true,
      },
    }),
  ]);

  const convertedLeads = leads.filter(
    (lead) =>
      Boolean(lead.convertedOrderId) ||
      lead.status === "CONVERTED",
  ).length;

  const completedOrders = orders.filter(
    (order) => order.status === "COMPLETED",
  ).length;

  const revenue = orders.reduce(
    (sum, order) =>
      sum +
      Number(
        order.invoice?.total ??
          order.finalTotal ??
          order.estimatedTotal ??
          0,
      ),
    0,
  );

  const paid = orders.reduce(
    (sum, order) =>
      sum + Number(order.invoice?.paid ?? 0),
    0,
  );

  return {
    leads: leads.length,
    convertedLeads,
    orders: orders.length,
    completedOrders,
    revenue,
    paid,
    lead_conversion_pct: pct(convertedLeads, leads.length),
    completion_pct: pct(completedOrders, orders.length),
    collection_pct: revenue > 0 ? pct(paid, revenue) : 0,
    order_attribution_pct: pct(
      orders.filter((order) => Boolean(order.attributionSource)).length,
      orders.length,
    ),
    lead_attribution_pct: pct(
      leads.filter((lead) => Boolean(lead.attributionSource)).length,
      leads.length,
    ),
  };
}
