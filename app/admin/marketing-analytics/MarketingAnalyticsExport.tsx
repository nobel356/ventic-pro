"use client";

type ExportRow = {
  type: string;
  source: string;
  campaign: string;
  leads: number;
  convertedLeads: number;
  orders: number;
  completedOrders: number;
  invoicedValue: number;
  averageOrderValue: number;
};

function quote(value: unknown) {
  const text = String(
    value ?? "",
  ).replace(/"/g, '""');

  return `"${text}"`;
}

export default function MarketingAnalyticsExport({
  periodDays,
  rows,
}: {
  periodDays: number;
  rows: ExportRow[];
}) {
  function download() {
    const header = [
      "type",
      "source",
      "campaign",
      "leads",
      "converted_leads",
      "orders",
      "completed_orders",
      "invoiced_value_egp",
      "average_order_value_egp",
    ];

    const body = [
      header.map(quote).join(","),
      ...rows.map((row) =>
        [
          row.type,
          row.source,
          row.campaign,
          row.leads,
          row.convertedLeads,
          row.orders,
          row.completedOrders,
          row.invoicedValue,
          row.averageOrderValue,
        ]
          .map(quote)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(
      ["\ufeff", body],
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
      `ventic-marketing-${periodDays}d.csv`;
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
