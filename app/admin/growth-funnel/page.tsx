import Link from "next/link";
import { redirect } from "next/navigation";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { buildGrowthFunnel } from "@/lib/growth-funnel";

export const dynamic = "force-dynamic";

export default async function GrowthFunnelPage() {
  try {
    await requirePermission(PERMISSIONS.REPORTS_VIEW);
  } catch {
    redirect("/admin");
  }

  const data = await buildGrowthFunnel();

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1250,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <h1 style={{ marginBottom: 6 }}>Growth Funnel Leaks</h1>
        <p style={{ color: "#64748b", lineHeight: 1.8 }}>
          مش Funnel رسمية مكررة؛ دي مقارنة مباشرة بين Actual والـTarget لتحديد مكان النزيف الحقيقي.
        </p>

        <div style={{ display: "grid", gap: 9, marginTop: 18 }}>
          {data.rows.map((row) => (
            <article
              key={row.key}
              style={{
                ...card,
                borderColor:
                  row.status === "LEAK"
                    ? "#fecaca"
                    : row.status === "WATCH"
                      ? "#fed7aa"
                      : "#bbf7d0",
              }}
            >
              <div>
                <span style={pill}>{row.status}</span>
                <h3 style={{ color: "#0b2f49", margin: "7px 0 4px" }}>
                  {row.label}
                </h3>
                <span style={{ color: "#64748b" }}>
                  Actual {row.actual}% · Target {row.target}% · Gap {row.gap} pp
                </span>
              </div>

              <Link href={row.href} style={action}>
                افتح مكان الإصلاح ←
              </Link>
            </article>
          ))}
        </div>

        {data.worst && (
          <div style={warning}>
            أكبر فجوة حاليًا: <strong>{data.worst.label}</strong> بفارق{" "}
            {Math.abs(data.worst.gap)} نقطة مئوية عن Target.
          </div>
        )}
      </section>
    </main>
  );
}

const card: React.CSSProperties = {
  background: "white",
  border: "1px solid",
  borderRadius: 14,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};
const pill: React.CSSProperties = {
  background: "#f1f5f9",
  color: "#475569",
  borderRadius: 999,
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
};
const action: React.CSSProperties = {
  textDecoration: "none",
  background: "#eef8fd",
  color: "#075985",
  border: "1px solid #bae6fd",
  borderRadius: 9,
  padding: "8px 10px",
  fontWeight: 900,
};
const warning: React.CSSProperties = {
  marginTop: 16,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  borderRadius: 10,
  padding: 11,
};
