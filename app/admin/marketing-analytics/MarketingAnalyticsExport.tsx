"use client";

type ExportRow = {
  type: string;
  source: string;
  campaign: string;
  leads: number;
  convertedLeads: number;
  newCustomers: number;
  orders: number;
  completedOrders: number;
  invoicedValue: number;
  paidValue: number;
  adSpend: number;
  cpl: number;
  cpa: number;
  cac: number;
  roas: number;
  collectedRoas: number;
  marketingContribution: number;
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
      "new_customers",
      "orders",
      "completed_orders",
      "invoiced_value_egp",
      "paid_value_egp",
      "ad_spend_egp",
      "cpl_egp",
      "cpa_per_order_egp",
      "cac_new_customer_egp",
      "invoice_roas",
      "collected_roas",
      "marketing_contribution_egp",
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
          row.newCustomers,
          row.orders,
          row.completedOrders,
          row.invoicedValue,
          row.paidValue,
          row.adSpend,
          row.cpl,
          row.cpa,
          row.cac,
          row.roas,
          row.collectedRoas,
          row.marketingContribution,
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
