import {
  getGrowthTargets,
  getThirtyDayGrowthMetrics,
} from "@/lib/growth-metrics";
import { buildSeoHealth } from "@/lib/seo-health";

export async function buildGrowthFunnel() {
  const [metrics, targets, seo] = await Promise.all([
    getThirtyDayGrowthMetrics(),
    getGrowthTargets(),
    buildSeoHealth(),
  ]);

  const targetMap = new Map(
    targets.map((item) => [item.key, Number(item.targetValue)]),
  );

  const rows = [
    {
      key: "lead_conversion_pct",
      label: "Lead → Order",
      actual: metrics.lead_conversion_pct,
      target: targetMap.get("lead_conversion_pct") ?? 25,
      href: "/admin/leads",
    },
    {
      key: "completion_pct",
      label: "Order → Completed",
      actual: metrics.completion_pct,
      target: targetMap.get("completion_pct") ?? 70,
      href: "/admin/orders",
    },
    {
      key: "collection_pct",
      label: "Revenue → Paid",
      actual: metrics.collection_pct,
      target: targetMap.get("collection_pct") ?? 80,
      href: "/admin/accounting",
    },
    {
      key: "order_attribution_pct",
      label: "Order Attribution",
      actual: metrics.order_attribution_pct,
      target: targetMap.get("order_attribution_pct") ?? 90,
      href: "/admin/attribution-health",
    },
    {
      key: "lead_attribution_pct",
      label: "Lead Attribution",
      actual: metrics.lead_attribution_pct,
      target: targetMap.get("lead_attribution_pct") ?? 90,
      href: "/admin/attribution-health",
    },
    {
      key: "seo_score",
      label: "SEO Health",
      actual: seo.score,
      target: targetMap.get("seo_score") ?? 85,
      href: "/admin/seo-actions",
    },
  ].map((item) => ({
    ...item,
    gap: Number((item.actual - item.target).toFixed(1)),
    status:
      item.actual >= item.target
        ? ("PASS" as const)
        : item.actual >= item.target * 0.85
          ? ("WATCH" as const)
          : ("LEAK" as const),
  }));

  rows.sort((a, b) => a.gap - b.gap);

  return {
    metrics,
    rows,
    worst: rows[0] || null,
  };
}
