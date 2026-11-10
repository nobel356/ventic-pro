"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Opportunity = {
  id: string;
  type:
    | "CTA"
    | "CONVERSION"
    | "CONTENT_GAP"
    | "WINNER"
    | "LOW_TRACTION";
  priority:
    | "HIGH"
    | "MEDIUM"
    | "LOW";
  title: string;
  detail: string;
  recommendation: string;
  href: string;
  slug?: string;
  category?: string;
  score: number;
  evidence: {
    views?: number;
    uniqueSessions?: number;
    intentClicks?: number;
    orderCount?: number;
    ctaRate?: number;
    conversionRate?: number;
  };
};

type Payload = {
  dataReady: boolean;
  message: string | null;
  sample: {
    articles: number;
    views: number;
    uniqueSessions: number;
    orders: number;
  };
  opportunities: Opportunity[];
};

export default function ContentGrowthDashboard() {
  const [days, setDays] =
    useState(30);
  const [data, setData] =
    useState<Payload | null>(
      null,
    );
  const [type, setType] =
    useState("ALL");
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setMessage("");

      try {
        const res =
          await fetch(
            "/api/admin/content-growth?days=" +
              days,
            {
              cache:
                "no-store",
            },
          );

        const payload =
          await res
            .json()
            .catch(
              () => ({}),
            );

        if (!res.ok) {
          throw new Error(
            payload?.error ||
              "تعذر تحميل الفرص.",
          );
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (error: any) {
        if (!cancelled) {
          setMessage(
            error?.message ||
              "تعذر تحميل الفرص.",
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [days]);

  const rows = useMemo(
    () =>
      (
        data?.opportunities ||
        []
      ).filter(
        (item) =>
          type === "ALL" ||
          item.type === type,
      ),
    [data, type],
  );

  return (
    <div
      dir="rtl"
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <div style={head}>
        <div>
          <h1
            style={{
              margin:
                "0 0 6px",
              color:
                "#071a2b",
            }}
          >
            Content Growth
          </h1>
          <p style={muted}>
            فرص النمو مبنية على السلوك والتحويل الفعلي، مش على زيادة عدد المقالات لمجرد النشر.
          </p>
        </div>

        <select
          value={days}
          onChange={(
            event,
          ) =>
            setDays(
              Number(
                event.target
                  .value,
              ),
            )
          }
          style={select}
        >
          <option value={7}>
            آخر 7 أيام
          </option>
          <option value={30}>
            آخر 30 يوم
          </option>
          <option value={90}>
            آخر 90 يوم
          </option>
        </select>
      </div>

      {message && (
        <div style={warning}>
          {message}
        </div>
      )}

      {data?.message && (
        <div style={info}>
          {data.message}
        </div>
      )}

      <div style={stats}>
        <Stat
          label="Articles"
          value={
            data?.sample
              .articles || 0
          }
        />
        <Stat
          label="Views"
          value={
            data?.sample
              .views || 0
          }
        />
        <Stat
          label="Unique Sessions"
          value={
            data?.sample
              .uniqueSessions ||
            0
          }
        />
        <Stat
          label="Orders"
          value={
            data?.sample
              .orders || 0
          }
        />
        <Stat
          label="Opportunities"
          value={
            data
              ?.opportunities
              .length || 0
          }
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 7,
          flexWrap: "wrap",
        }}
      >
        {[
          ["ALL", "الكل"],
          ["CTA", "CTA"],
          [
            "CONVERSION",
            "Conversion",
          ],
          ["WINNER", "Winners"],
          [
            "CONTENT_GAP",
            "Content Gap",
          ],
          [
            "LOW_TRACTION",
            "Low Traction",
          ],
        ].map(
          ([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setType(value)
              }
              style={{
                ...filter,
                ...(type === value
                  ? activeFilter
                  : {}),
              }}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {rows.length === 0 ? (
        <div style={success}>
          مفيش فرصة واضحة في الفِلتر الحالي، أو الداتا لسه قليلة.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {rows.map(
            (item) => (
              <article
                key={item.id}
                style={card}
              >
                <div style={head}>
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
                          priorityPill
                        }
                      >
                        {
                          item.priority
                        }
                      </span>
                      <span
                        style={
                          typePill
                        }
                      >
                        {
                          item.type
                        }
                      </span>
                      <span
                        style={
                          scorePill
                        }
                      >
                        Score{" "}
                        {
                          item.score
                        }
                      </span>
                    </div>

                    <h3
                      style={{
                        color:
                          "#0b2f49",
                        margin:
                          "8px 0 5px",
                      }}
                    >
                      {item.title}
                    </h3>

                    <p
                      style={{
                        ...muted,
                        marginBottom:
                          0,
                      }}
                    >
                      {item.detail}
                    </p>
                  </div>

                  <a
                    href={item.href}
                    style={action}
                  >
                    افتح البيانات ←
                  </a>
                </div>

                <div
                  style={
                    recommendation
                  }
                >
                  <strong>
                    الإجراء المقترح
                  </strong>
                  <span>
                    {
                      item.recommendation
                    }
                  </span>
                </div>

                <div style={evidence}>
                  {item.evidence
                    .views !==
                    undefined && (
                    <Metric
                      label="Views"
                      value={
                        item
                          .evidence
                          .views
                      }
                    />
                  )}
                  {item.evidence
                    .uniqueSessions !==
                    undefined && (
                    <Metric
                      label="Unique"
                      value={
                        item
                          .evidence
                          .uniqueSessions
                      }
                    />
                  )}
                  {item.evidence
                    .intentClicks !==
                    undefined && (
                    <Metric
                      label="CTA"
                      value={
                        item
                          .evidence
                          .intentClicks
                      }
                    />
                  )}
                  {item.evidence
                    .orderCount !==
                    undefined && (
                    <Metric
                      label="Orders"
                      value={
                        item
                          .evidence
                          .orderCount
                      }
                    />
                  )}
                  {item.evidence
                    .ctaRate !==
                    undefined && (
                    <Metric
                      label="CTA %"
                      value={
                        item
                          .evidence
                          .ctaRate +
                        "%"
                      }
                    />
                  )}
                  {item.evidence
                    .conversionRate !==
                    undefined && (
                    <Metric
                      label="Conv %"
                      value={
                        item
                          .evidence
                          .conversionRate +
                        "%"
                      }
                    />
                  )}
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div style={stat}>
      <small
        style={{
          color: "#64748b",
        }}
      >
        {label}
      </small>
      <strong
        style={{
          color: "#0b2f49",
          fontSize: 24,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <span style={metric}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
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
  lineHeight: 1.75,
  maxWidth: 900,
};
const select: React.CSSProperties = {
  border:
    "1px solid #cbd5e1",
  borderRadius: 10,
  minHeight: 40,
  padding: "8px 10px",
  font: "inherit",
};
const stats: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(150px,1fr))",
  gap: 8,
};
const stat: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 13,
  padding: 12,
  display: "grid",
  gap: 4,
};
const filter: React.CSSProperties = {
  border:
    "1px solid #cbd5e1",
  borderRadius: 999,
  background: "white",
  color: "#475569",
  padding: "7px 10px",
  fontWeight: 800,
  cursor: "pointer",
};
const activeFilter: React.CSSProperties = {
  background: "#0b2f49",
  borderColor: "#0b2f49",
  color: "white",
};
const card: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 15,
  padding: 14,
  display: "grid",
  gap: 12,
};
const priorityPill: React.CSSProperties = {
  borderRadius: 999,
  background: "#fff7ed",
  color: "#9a3412",
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
};
const typePill: React.CSSProperties = {
  ...priorityPill,
  background: "#eff6ff",
  color: "#1d4ed8",
};
const scorePill: React.CSSProperties = {
  ...priorityPill,
  background: "#f1f5f9",
  color: "#475569",
};
const action: React.CSSProperties = {
  textDecoration: "none",
  background: "#eef8fd",
  color: "#075985",
  border:
    "1px solid #bae6fd",
  borderRadius: 9,
  padding: "8px 10px",
  fontWeight: 900,
};
const recommendation: React.CSSProperties = {
  display: "grid",
  gap: 5,
  background: "#f8fafc",
  border:
    "1px solid #e2e8f0",
  borderRadius: 11,
  padding: 11,
  color: "#334155",
  lineHeight: 1.7,
};
const evidence: React.CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
};
const metric: React.CSSProperties = {
  minWidth: 80,
  display: "grid",
  gap: 2,
  background: "#f8fafc",
  border:
    "1px solid #e2e8f0",
  borderRadius: 9,
  padding: "7px 9px",
};
const warning: React.CSSProperties = {
  background: "#fff7ed",
  border:
    "1px solid #fed7aa",
  color: "#9a3412",
  borderRadius: 10,
  padding: 10,
};
const info: React.CSSProperties = {
  background: "#eff6ff",
  border:
    "1px solid #bfdbfe",
  color: "#1e40af",
  borderRadius: 10,
  padding: 10,
};
const success: React.CSSProperties = {
  background: "#f0fdf4",
  border:
    "1px solid #bbf7d0",
  color: "#166534",
  borderRadius: 10,
  padding: 11,
};
