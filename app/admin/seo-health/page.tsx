import Link from "next/link";
import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import { buildSeoHealth } from "@/lib/seo-health";

export const dynamic = "force-dynamic";

function severityStyle(severity: string): React.CSSProperties {
  if (severity === "CRITICAL") {
    return { background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" };
  }
  if (severity === "HIGH") {
    return { background: "#fff7ed", color: "#9a3412", borderColor: "#fed7aa" };
  }
  if (severity === "MEDIUM") {
    return { background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" };
  }
  return { background: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" };
}

export default async function SeoHealthPage() {
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

  const health = await buildSeoHealth();

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1500,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <div style={head}>
          <div>
            <h1 style={{ marginBottom: 6 }}>
              SEO Health Center
            </h1>
            <p style={muted}>
              جودة المقالات وLocal SEO والبنية الأساسية في شاشة واحدة. الأولوية هنا لإصلاح مشاكل حقيقية قبل نشر محتوى جديد.
            </p>
          </div>

          <div style={scoreBox}>
            <small>SEO Score</small>
            <strong>{health.score}/100</strong>
          </div>
        </div>

        <div style={stats}>
          <Stat label="Critical" value={health.counts.critical} danger />
          <Stat label="High" value={health.counts.high} warning />
          <Stat label="Medium" value={health.counts.medium} />
          <Stat label="Published Articles" value={health.totals.articles} />
          <Stat label="Indexed Areas" value={health.totals.indexedAreas} />
          <Stat label="Expected Sitemap URLs" value={health.totals.expectedSitemapUrls} />
        </div>

        <section style={card}>
          <h2 style={h2}>Infrastructure</h2>
          <div style={grid}>
            {health.infrastructure.map((item) => (
              <div key={item.id} style={miniCard}>
                <span style={pass}>PASS</span>
                <strong>{item.label}</strong>
                <p style={smallMuted}>{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={card}>
          <h2 style={h2}>Topic Hubs</h2>
          <div style={grid}>
            {health.categoryCounts.map((item) => (
              <div key={item.slug} style={miniCard}>
                <strong>{item.name}</strong>
                <span style={{ color: "#64748b" }}>
                  {item.count} مقال منشور
                </span>
              </div>
            ))}
          </div>
        </section>

        <section style={card}>
          <div style={head}>
            <div>
              <h2 style={h2}>المشاكل المطلوبة</h2>
              <p style={smallMuted}>
                ابدأ بالـCritical ثم High. ما تزودش مقالات جديدة قبل ما المشاكل المؤثرة تتقفل.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/admin/blog" style={action}>
                إدارة المقالات
              </Link>
              <Link href="/admin/areas" style={action}>
                Local SEO
              </Link>
            </div>
          </div>

          {health.issues.length === 0 ? (
            <div style={success}>
              مفيش مشاكل SEO واضحة حسب قواعد V44 الحالية.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              {health.issues.map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    ...issueCard,
                    ...severityStyle(issue.severity),
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={badge}>{issue.severity}</span>
                      <strong>{issue.title}</strong>
                    </div>
                    <p style={{ marginBottom: 0, lineHeight: 1.7 }}>
                      {issue.detail}
                    </p>
                  </div>

                  <Link href={issue.href} style={action}>
                    إصلاح ←
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <p style={{ color: "#94a3b8", fontSize: 12 }}>
          آخر فحص: {new Date(health.generatedAt).toLocaleString("ar-EG")}
        </p>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  danger = false,
  warning = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        ...stat,
        background: danger
          ? "#fef2f2"
          : warning
            ? "#fff7ed"
            : "white",
        borderColor: danger
          ? "#fecaca"
          : warning
            ? "#fed7aa"
            : "#dbe7ef",
      }}
    >
      <small style={{ color: "#64748b" }}>{label}</small>
      <strong style={{ fontSize: 24, color: danger ? "#991b1b" : warning ? "#9a3412" : "#0b2f49" }}>
        {value}
      </strong>
    </div>
  );
}

const head: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};
const muted: React.CSSProperties = {
  color: "#64748b",
  marginTop: 0,
  lineHeight: 1.8,
  maxWidth: 850,
};
const scoreBox: React.CSSProperties = {
  minWidth: 130,
  background: "#0b2f49",
  color: "white",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 3,
  textAlign: "center",
};
const stats: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
  gap: 9,
  marginTop: 18,
};
const stat: React.CSSProperties = {
  border: "1px solid #dbe7ef",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 4,
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
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 9,
};
const miniCard: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 5,
};
const pass: React.CSSProperties = {
  width: "fit-content",
  background: "#f0fdf4",
  color: "#166534",
  borderRadius: 999,
  padding: "4px 7px",
  fontWeight: 900,
  fontSize: 11,
};
const smallMuted: React.CSSProperties = {
  color: "#64748b",
  margin: 0,
  lineHeight: 1.7,
  fontSize: 13,
};
const issueCard: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 13,
  padding: 13,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};
const badge: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 7px",
  background: "rgba(255,255,255,.75)",
  fontWeight: 900,
  fontSize: 10,
};
const action: React.CSSProperties = {
  textDecoration: "none",
  background: "white",
  color: "#075985",
  border: "1px solid #bae6fd",
  borderRadius: 10,
  padding: "8px 11px",
  fontWeight: 900,
};
const success: React.CSSProperties = {
  background: "#f0fdf4",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: 10,
  padding: 11,
};
