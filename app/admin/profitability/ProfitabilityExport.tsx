"use client";

type ExportRow = {
  orderNo: string;
  customer: string;
  status: string;
  source: string;
  area: string;
  revenue: number;
  paid: number;
  materialCost: number;
  adCost: number;
  manualCost: number;
  knownCost: number;
  contribution: number;
  marginPercent: number;
};

function quote(value: unknown) {
  return `"${String(
    value ?? "",
  ).replace(/"/g, '""')}"`;
}

export default function ProfitabilityExport({
  periodDays,
  rows,
}: {
  periodDays: number;
  rows: ExportRow[];
}) {
  function download() {
    const header = [
      "order_no",
      "customer",
      "status",
      "source",
      "area",
      "revenue_egp",
      "paid_egp",
      "material_cost_estimate_egp",
      "allocated_ad_cost_egp",
      "manual_operating_cost_egp",
      "known_direct_cost_egp",
      "known_contribution_egp",
      "known_margin_percent",
    ];

    const lines = [
      header.map(quote).join(","),
      ...rows.map((row) =>
        [
          row.orderNo,
          row.customer,
          row.status,
          row.source,
          row.area,
          row.revenue,
          row.paid,
          row.materialCost,
          row.adCost,
          row.manualCost,
          row.knownCost,
          row.contribution,
          row.marginPercent,
        ]
          .map(quote)
          .join(","),
      ),
    ];

    const blob = new Blob(
      [
        "\ufeff",
        lines.join("\n"),
      ],
      {
        type: "text/csv;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(blob);
    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      `ventic-profitability-${periodDays}d.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      style={{
        minHeight: 40,
        border: 0,
        borderRadius: 10,
        background: "#0f2d4a",
        color: "white",
        padding: "0 13px",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      تصدير CSV
    </button>
  );
}
