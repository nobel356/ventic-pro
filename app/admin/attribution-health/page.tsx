import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import {
  effectiveAttribution,
  hasStructuredAttribution,
} from "@/lib/attribution-integrity";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ period?: string }>;

function safePeriod(value: string | undefined) {
  const parsed = Number(value);
  return [7, 30, 90].includes(parsed) ? parsed : 30;
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

export default async function AttributionHealthPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.REPORTS_VIEW,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  const params = await searchParams;
  const days = safePeriod(params.period);
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  );

  const [orders, leads] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        orderNo: true,
        acquisitionSource: true,
        attributionSource: true,
        attributionMedium: true,
        attributionCampaign: true,
        attributionContent: true,
        attributionTerm: true,
        attributionRef: true,
        attributionLanding: true,
      },
    }),
    prisma.lead.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        source: true,
        convertedOrderId: true,
        attributionSource: true,
        attributionMedium: true,
        attributionCampaign: true,
        attributionContent: true,
        attributionTerm: true,
        attributionRef: true,
        attributionLanding: true,
      },
    }),
  ]);

  const orderRows = orders.map((item) => {
    const structured = {
      raw: item.acquisitionSource,
      source: item.attributionSource,
      medium: item.attributionMedium,
      campaign: item.attributionCampaign,
      content: item.attributionContent,
      term: item.attributionTerm,
      ref: item.attributionRef,
      landing: item.attributionLanding,
    };

    return {
      structured: hasStructuredAttribution(structured),
      raw: Boolean(item.acquisitionSource),
      attribution: effectiveAttribution(structured),
    };
  });

  const leadRows = leads.map((item) => {
    const structured = {
      raw: item.source,
      source: item.attributionSource,
      medium: item.attributionMedium,
      campaign: item.attributionCampaign,
      content: item.attributionContent,
      term: item.attributionTerm,
      ref: item.attributionRef,
      landing: item.attributionLanding,
    };

    return {
      structured: hasStructuredAttribution(structured),
      raw: Boolean(item.source),
      converted: Boolean(item.convertedOrderId),
      attribution: effectiveAttribution(structured),
    };
  });

  const orderRaw = orderRows.filter((x) => x.raw).length;
  const orderStructured = orderRows.filter((x) => x.structured).length;
  const leadRaw = leadRows.filter((x) => x.raw).length;
  const leadStructured = leadRows.filter((x) => x.structured).length;
  const convertedMissing = leadRows.filter(
    (x) => x.converted && !x.raw && !x.structured,
  ).length;

  const sourceMap = new Map<
    string,
    { leads: number; orders: number }
  >();

  function ensureSource(source: string) {
    const key = source || "غير معروف / مباشر";
    const existing = sourceMap.get(key);
    if (existing) return existing;

    const created = { leads: 0, orders: 0 };
    sourceMap.set(key, created);
    return created;
  }

  for (const row of leadRows) {
    ensureSource(row.attribution.source).leads += 1;
  }

  for (const row of orderRows) {
    ensureSource(row.attribution.source).orders += 1;
  }

  const sources = [...sourceMap.entries()]
    .map(([source, values]) => ({
      source,
      ...values,
    }))
    .sort(
      (a, b) =>
        b.orders - a.orders ||
        b.leads - a.leads,
    );

  const problems = [
    orderRows.length &&
    orderStructured < orderRows.length
      ? `${orderRows.length - orderStructured} أوردر بدون Structured Attribution`
      : "",
    leadRows.length &&
    leadStructured < leadRows.length
      ? `${leadRows.length - leadStructured} Lead بدون Structured Attribution`
      : "",
    convertedMissing
      ? `${convertedMissing} Lead متحول لأوردر بدون مصدر`
      : "",
  ].filter(Boolean);

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1450,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <div style={head}>
          <div>
            <h1 style={{ marginBottom: 6 }}>
              Attribution Health
            </h1>
            <p style={muted}>
              جودة بيانات المصدر من أول Lead لحد Order. الشاشة دي لا تستبدل تحليلات التسويق؛ هي تكشف هل البيانات التي تعتمد عليها كاملة أصلًا.
            </p>
          </div>

          <Link
            href="/admin/marketing-analytics"
            style={action}
          >
            تحليلات التسويق ←
          </Link>
        </div>

        <div style={periods}>
          {[7, 30, 90].map((value) => (
            <Link
              key={value}
              href={
                "/admin/attribution-health?period=" +
                value
              }
              style={{
                ...period,
                ...(value === days
                  ? activePeriod
                  : {}),
              }}
            >
              آخر {value} يوم
            </Link>
          ))}
        </div>

        <div style={stats}>
          <Stat
            label="Order Raw Coverage"
            value={pct(orderRaw, orderRows.length) + "%"}
            danger={pct(orderRaw, orderRows.length) < 90}
          />
          <Stat
            label="Order Structured"
            value={
              pct(orderStructured, orderRows.length) + "%"
            }
            danger={
              pct(orderStructured, orderRows.length) < 90
            }
          />
          <Stat
            label="Lead Raw Coverage"
            value={pct(leadRaw, leadRows.length) + "%"}
            danger={pct(leadRaw, leadRows.length) < 90}
          />
          <Stat
            label="Lead Structured"
            value={
              pct(leadStructured, leadRows.length) + "%"
            }
            danger={
              pct(leadStructured, leadRows.length) < 90
            }
          />
          <Stat
            label="Converted Missing"
            value={convertedMissing}
            danger={convertedMissing > 0}
          />
        </div>

        <section style={card}>
          <h2 style={h2}>سلامة البيانات</h2>
          {problems.length === 0 ? (
            <div style={success}>
              لا توجد فجوات واضحة في Attribution خلال الفترة المختارة.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {problems.map((problem) => (
                <div key={problem} style={warning}>
                  {problem}
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={card}>
          <h2 style={h2}>المصدر: Leads → Orders</h2>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 650,
              }}
            >
              <thead>
                <tr>
                  <th>المصدر</th>
                  <th>Leads</th>
                  <th>Orders</th>
                  <th>Lead→Order</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((row) => (
                  <tr key={row.source}>
                    <td>
                      <strong>{row.source}</strong>
                    </td>
                    <td>{row.leads}</td>
                    <td>{row.orders}</td>
                    <td>
                      {row.leads
                        ? pct(row.orders, row.leads) + "%"
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        ...stat,
        borderColor: danger
          ? "#fecaca"
          : "#dbe7ef",
        background: danger
          ? "#fef2f2"
          : "white",
      }}
    >
      <small style={{ color: "#64748b" }}>
        {label}
      </small>
      <strong
        style={{
          fontSize: 25,
          color: danger
            ? "#991b1b"
            : "#0b2f49",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const head: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const muted: React.CSSProperties = {
  color: "#64748b",
  marginTop: 0,
  lineHeight: 1.8,
  maxWidth: 850,
};
const action: React.CSSProperties = {
  textDecoration: "none",
  background: "#eef8fd",
  color: "#075985",
  border: "1px solid #bae6fd",
  borderRadius: 10,
  padding: "9px 12px",
  fontWeight: 900,
};
const periods: React.CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
  margin: "18px 0",
};
const period: React.CSSProperties = {
  textDecoration: "none",
  color: "#475569",
  background: "white",
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  padding: "7px 10px",
  fontWeight: 800,
};
const activePeriod: React.CSSProperties = {
  color: "white",
  background: "#0b2f49",
  borderColor: "#0b2f49",
};
const stats: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 9,
};
const stat: React.CSSProperties = {
  border: "1px solid #dbe7ef",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 5,
};
const card: React.CSSProperties = {
  marginTop: 16,
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 16,
  padding: 16,
};
const h2: React.CSSProperties = {
  color: "#0b2f49",
  marginTop: 0,
};
const success: React.CSSProperties = {
  background: "#f0fdf4",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: 10,
  padding: 11,
};
const warning: React.CSSProperties = {
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  borderRadius: 10,
  padding: 11,
};
