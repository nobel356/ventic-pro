import Link from "next/link";
import { redirect } from "next/navigation";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { buildGrowthCommandCenter } from "@/lib/growth-command";

export const dynamic = "force-dynamic";

function money(value: number) {
  return value.toLocaleString(
    "ar-EG",
    {
      maximumFractionDigits: 0,
    },
  );
}

function priorityStyle(
  priority: string,
): React.CSSProperties {
  if (
    priority === "CRITICAL"
  ) {
    return {
      background:
        "#fef2f2",
      color: "#991b1b",
      borderColor:
        "#fecaca",
    };
  }

  if (priority === "HIGH") {
    return {
      background:
        "#fff7ed",
      color: "#9a3412",
      borderColor:
        "#fed7aa",
    };
  }

  if (
    priority === "MEDIUM"
  ) {
    return {
      background:
        "#eff6ff",
      color: "#1d4ed8",
      borderColor:
        "#bfdbfe",
    };
  }

  return {
    background: "#f8fafc",
    color: "#475569",
    borderColor: "#e2e8f0",
  };
}

export default async function GrowthDashboardPage() {
  try {
    await requirePermission(
      PERMISSIONS.REPORTS_VIEW,
    );
  } catch {
    redirect("/admin");
  }

  const data =
    await buildGrowthCommandCenter();

  return (
    <main
      className="admin"
      dir="rtl"
    >
      <section
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding:
            "24px 18px 70px",
        }}
      >
        <div style={head}>
          <div>
            <h1
              style={{
                marginBottom: 6,
              }}
            >
              Growth Command Center
            </h1>
            <p style={muted}>
              لقطة تنفيذية لآخر 30 يوم + جودة البيانات + أهم القرارات المطلوبة من SEO وContent وCRO.
            </p>
          </div>

          <Link
            href="/admin/marketing-analytics"
            style={action}
          >
            Marketing Analytics
          </Link>
        </div>

        <section style={section}>
          <h2 style={h2}>
            Business Snapshot
          </h2>

          <div style={stats}>
            <Stat
              label="Leads"
              value={
                data.snapshot.leads
              }
              meta={
                "Conversion " +
                data.snapshot
                  .leadConversion +
                "%"
              }
            />
            <Stat
              label="Orders"
              value={
                data.snapshot.orders
              }
              meta={
                "Completion " +
                data.snapshot
                  .completionRate +
                "%"
              }
            />
            <Stat
              label="Revenue"
              value={
                money(
                  data.snapshot
                    .revenue,
                ) + " ج"
              }
            />
            <Stat
              label="Paid"
              value={
                money(
                  data.snapshot
                    .paid,
                ) + " ج"
              }
              meta={
                "Collection " +
                data.snapshot
                  .collectionRate +
                "%"
              }
            />
          </div>
        </section>

        <section style={section}>
          <h2 style={h2}>
            Quality Gates
          </h2>

          <div style={stats}>
            <Stat
              label="SEO Score"
              value={
                data.quality
                  .seoScore +
                "/100"
              }
              danger={
                data.quality
                  .seoCritical > 0
              }
            />
            <Stat
              label="SEO Critical"
              value={
                data.quality
                  .seoCritical
              }
              danger={
                data.quality
                  .seoCritical > 0
              }
            />
            <Stat
              label="SEO Tasks"
              value={
                data.quality
                  .seoTodo +
                data.quality
                  .seoInProgress
              }
              meta={
                data.quality
                  .overdueSeoActions +
                " overdue"
              }
            />
            <Stat
              label="Order Attribution"
              value={
                data.quality
                  .orderAttributionCoverage +
                "%"
              }
              danger={
                data.quality
                  .orderAttributionCoverage <
                90
              }
            />
            <Stat
              label="Lead Attribution"
              value={
                data.quality
                  .leadAttributionCoverage +
                "%"
              }
              danger={
                data.quality
                  .leadAttributionCoverage <
                90
              }
            />
          </div>
        </section>

        <section style={section}>
          <div style={head}>
            <div>
              <h2 style={h2}>
                Next Best Actions
              </h2>
              <p style={muted}>
                الأولوية حسب المخاطر وجودة البيانات وفرص النمو. ما تنفذش كل حاجة مرة واحدة.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 9,
            }}
          >
            {data.actions.map(
              (item, index) => (
                <article
                  key={item.id}
                  style={{
                    ...decisionCard,
                    ...priorityStyle(
                      item.priority,
                    ),
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      gap: 10,
                      alignItems:
                        "flex-start",
                    }}
                  >
                    <strong
                      style={
                        rank
                      }
                    >
                      {index + 1}
                    </strong>

                    <div>
                      <div
                        style={{
                          display:
                            "flex",
                          gap: 7,
                          flexWrap:
                            "wrap",
                          alignItems:
                            "center",
                        }}
                      >
                        <span
                          style={
                            pill
                          }
                        >
                          {
                            item.priority
                          }
                        </span>
                        <strong>
                          {
                            item.title
                          }
                        </strong>
                      </div>

                      <p
                        style={{
                          margin:
                            "5px 0 0",
                          lineHeight:
                            1.7,
                        }}
                      >
                        {
                          item.detail
                        }
                      </p>
                    </div>
                  </div>

                  <Link
                    href={
                      item.href
                    }
                    style={action}
                  >
                    {item.label} ←
                  </Link>
                </article>
              ),
            )}
          </div>
        </section>

        <div style={twoCol}>
          <section style={section}>
            <h2 style={h2}>
              Content Growth
            </h2>

            <p style={muted}>
              Data status:{" "}
              <strong>
                {data.growth
                  .dataReady
                  ? "Ready"
                  : "Preliminary"}
              </strong>
            </p>

            {data.growth
              .opportunities
              .length ? (
              <div
                style={{
                  display:
                    "grid",
                  gap: 8,
                }}
              >
                {data.growth
                  .opportunities
                  .map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        style={
                          miniCard
                        }
                      >
                        <span
                          style={
                            pill
                          }
                        >
                          {
                            item.priority
                          }
                        </span>
                        <strong>
                          {
                            item.title
                          }
                        </strong>
                        <small
                          style={{
                            color:
                              "#64748b",
                            lineHeight:
                              1.6,
                          }}
                        >
                          {
                            item.detail
                          }
                        </small>
                      </div>
                    ),
                  )}
              </div>
            ) : (
              <p style={muted}>
                مفيش Opportunity واضحة حاليًا.
              </p>
            )}

            <Link
              href="/admin/content-growth"
              style={{
                ...action,
                marginTop: 10,
              }}
            >
              Content Growth
            </Link>
          </section>

          <section style={section}>
            <h2 style={h2}>
              CRO Pipeline
            </h2>

            <div style={stats}>
              <Stat
                label="Running"
                value={
                  data.cro.running
                }
              />
              <Stat
                label="Ready for Decision"
                value={
                  data.cro
                    .stoppedWithWinner
                }
                danger={
                  data.cro
                    .stoppedWithWinner >
                  0
                }
              />
              <Stat
                label="Tracked"
                value={
                  data.cro
                    .totalTracked
                }
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              <Link
                href="/admin/cro-experiments"
                style={action}
              >
                Experiments
              </Link>
              <Link
                href="/admin/cro-decisions"
                style={action}
              >
                Decisions
              </Link>
            </div>
          </section>
        </div>

        <section style={section}>
          <h2 style={h2}>
            Quick Access
          </h2>

          <div style={quickGrid}>
            <Quick
              href="/admin/growth-targets"
              label="Growth Targets"
            />
            <Quick
              href="/admin/growth-funnel"
              label="Funnel Leaks"
            />
            <Quick
              href="/admin/growth-reviews"
              label="Weekly Review"
            />
            <Quick
              href="/admin/growth-commitments"
              label="Commitments"
            />
            <Quick
              href="/admin/seo-health"
              label="SEO Health"
            />
            <Quick
              href="/admin/seo-actions"
              label="SEO Actions"
            />
            <Quick
              href="/admin/attribution-health"
              label="Attribution"
            />
            <Quick
              href="/admin/blog/performance"
              label="Blog Performance"
            />
            <Quick
              href="/admin/content-growth"
              label="Content Growth"
            />
            <Quick
              href="/admin/cro-decisions"
              label="CRO Decisions"
            />
          </div>
        </section>

        <p
          style={{
            color: "#94a3b8",
            fontSize: 12,
          }}
        >
          Last refresh:{" "}
          {new Date(
            data.generatedAt,
          ).toLocaleString(
            "ar-EG",
          )}
        </p>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  meta,
  danger = false,
}: {
  label: string;
  value: string | number;
  meta?: string;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        ...stat,
        background: danger
          ? "#fef2f2"
          : "white",
        borderColor: danger
          ? "#fecaca"
          : "#dbe7ef",
      }}
    >
      <b
        style={{
          fontSize: 23,
          color: danger
            ? "#991b1b"
            : "#0f2d4a",
        }}
      >
        {value}
      </b>
      <span
        style={{
          color: "#64748b",
          fontSize: 12,
        }}
      >
        {label}
      </span>
      {meta && (
        <small
          style={{
            color: "#94a3b8",
          }}
        >
          {meta}
        </small>
      )}
    </div>
  );
}

function Quick({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={quick}
    >
      {label}
    </Link>
  );
}

const head: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const muted: React.CSSProperties = {
  color: "#64748b",
  marginTop: 0,
  lineHeight: 1.8,
};
const section: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  marginTop: 16,
};
const h2: React.CSSProperties = {
  color: "#0b2f49",
  marginTop: 0,
};
const stats: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(155px,1fr))",
  gap: 9,
};
const stat: React.CSSProperties = {
  border:
    "1px solid #dbe7ef",
  borderRadius: 13,
  padding: 12,
  display: "grid",
  gap: 4,
};
const decisionCard: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 13,
  padding: 12,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const rank: React.CSSProperties = {
  width: 30,
  height: 30,
  flex: "0 0 30px",
  display: "grid",
  placeItems: "center",
  borderRadius: 9,
  background:
    "rgba(255,255,255,.75)",
};
const pill: React.CSSProperties = {
  width: "fit-content",
  borderRadius: 999,
  background:
    "rgba(255,255,255,.75)",
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
};
const action: React.CSSProperties = {
  minHeight: 38,
  display: "inline-flex",
  alignItems: "center",
  border:
    "1px solid #bae6fd",
  borderRadius: 9,
  padding: "0 10px",
  color: "#075985",
  background: "#eef8fd",
  textDecoration: "none",
  fontWeight: 900,
};
const twoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(330px,1fr))",
  gap: 16,
};
const miniCard: React.CSSProperties = {
  border:
    "1px solid #e2e8f0",
  borderRadius: 11,
  padding: 10,
  display: "grid",
  gap: 5,
};
const quickGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(150px,1fr))",
  gap: 8,
};
const quick: React.CSSProperties = {
  minHeight: 42,
  display: "grid",
  placeItems: "center",
  border:
    "1px solid #cbd5e1",
  borderRadius: 10,
  background: "#f8fafc",
  color: "#0f2d4a",
  textDecoration: "none",
  fontWeight: 900,
};
