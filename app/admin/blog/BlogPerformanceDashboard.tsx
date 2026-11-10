"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  slug: string;
  title: string;
  category: string;
  views: number;
  uniqueSessions: number;
  serviceClicks: number;
  calculatorClicks: number;
  orderClicks: number;
  relatedClicks: number;
  intentClicks: number;
  orderCount: number;
  orderValue: number;
  ctaRate: number;
  conversionRate: number;
};

type Payload = {
  totals: {
    views: number;
    uniqueSessions: number;
    intentClicks: number;
    orderCount: number;
    orderValue: number;
  };
  rows: Row[];
};

export default function BlogPerformanceDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Payload | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          "/api/admin/blog/performance?days=" + days,
          { cache: "no-store" },
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            payload?.error || "تعذر تحميل الأداء.",
          );
        }
        if (!cancelled) setData(payload);
      } catch (error: any) {
        if (!cancelled) {
          setMessage(
            error?.message || "تعذر تحميل الأداء.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const ranked = useMemo(
    () =>
      [...(data?.rows || [])].sort(
        (a, b) =>
          b.orderCount - a.orderCount ||
          b.intentClicks - a.intentClicks ||
          b.views - a.views,
      ),
    [data],
  );

  return (
    <div dir="rtl" style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ color: "#071a2b", margin: "0 0 5px" }}>
            أداء المحتوى
          </h2>
          <p style={{ color: "#64748b", margin: 0, lineHeight: 1.7 }}>
            زيارات المقالات، نقرات CTA، والطلبات الفعلية المنسوبة لكل مقال.
          </p>
        </div>

        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          style={select}
        >
          <option value={7}>آخر 7 أيام</option>
          <option value={30}>آخر 30 يوم</option>
          <option value={90}>آخر 90 يوم</option>
        </select>
      </div>

      {message && <div style={messageBox}>{message}</div>}

      <div style={kpiGrid}>
        <Kpi label="مشاهدات" value={data?.totals.views || 0} />
        <Kpi label="Sessions" value={data?.totals.uniqueSessions || 0} />
        <Kpi label="CTA Clicks" value={data?.totals.intentClicks || 0} />
        <Kpi label="طلبات فعلية" value={data?.totals.orderCount || 0} />
        <Kpi
          label="قيمة الطلبات"
          value={(data?.totals.orderValue || 0).toLocaleString("ar-EG") + " ج"}
        />
      </div>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid #dbe7ef",
          borderRadius: 14,
          background: "white",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1100,
          }}
        >
          <thead>
            <tr>
              {[
                "المقال",
                "Views",
                "Unique",
                "Service",
                "Calculator",
                "Order Click",
                "Orders",
                "CTA %",
                "Conversion %",
                "Order Value",
              ].map((label) => (
                <th key={label} style={th}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => (
              <tr key={row.slug}>
                <td style={td}>
                  <a
                    href={"/blog/" + row.slug}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#075985",
                      fontWeight: 900,
                      textDecoration: "none",
                    }}
                  >
                    {row.title}
                  </a>
                  <small
                    style={{
                      display: "block",
                      color: "#64748b",
                      marginTop: 3,
                    }}
                  >
                    {row.category}
                  </small>
                </td>
                <td style={num}>{row.views}</td>
                <td style={num}>{row.uniqueSessions}</td>
                <td style={num}>{row.serviceClicks}</td>
                <td style={num}>{row.calculatorClicks}</td>
                <td style={num}>{row.orderClicks}</td>
                <td style={numStrong}>{row.orderCount}</td>
                <td style={num}>{row.ctaRate}%</td>
                <td style={num}>{row.conversionRate}%</td>
                <td style={numStrong}>
                  {row.orderValue.toLocaleString("ar-EG")} ج
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div style={kpi}>
      <small style={{ color: "#64748b" }}>{label}</small>
      <strong style={{ color: "#0b2f49", fontSize: 25 }}>
        {value}
      </strong>
    </div>
  );
}

const select: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  minHeight: 40,
  padding: "8px 10px",
  font: "inherit",
};
const messageBox: React.CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: 10,
  padding: 10,
  color: "#9a3412",
};
const kpiGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
  gap: 9,
};
const kpi: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 13,
  padding: 13,
  display: "grid",
  gap: 4,
};
const th: React.CSSProperties = {
  textAlign: "right",
  padding: 11,
  color: "#475569",
  fontSize: 12,
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
};
const td: React.CSSProperties = {
  padding: 11,
  borderBottom: "1px solid #f1f5f9",
};
const num: React.CSSProperties = {
  ...td,
  textAlign: "center",
  color: "#475569",
  fontVariantNumeric: "tabular-nums",
};
const numStrong: React.CSSProperties = {
  ...num,
  color: "#0b2f49",
  fontWeight: 900,
};
