"use client";

import {
  useEffect,
  useState,
} from "react";

type Stage = {
  key: string;
  label: string;
  status: string;
  detail: string;
  href: string;
};

type Payload = {
  implementationStatus: string;
  executionStatus: string;
  generatedAt: string;
  stages: Stage[];
  metrics: Record<
    string,
    number
  >;
  indexing: {
    searchConsoleVerified: boolean;
    sitemapSubmitted: boolean;
    indexedUrls: number;
    lastCheckedAt: string;
    verificationMetaConfigured: boolean;
    sitemapUrl: string;
    robotsUrl: string;
  };
};

export default function GrowthExecutionCenter({
  isSuperAdmin,
}: {
  isSuperAdmin: boolean;
}) {
  const [data, setData] =
    useState<Payload | null>(
      null,
    );
  const [message, setMessage] =
    useState("");
  const [form, setForm] =
    useState({
      searchConsoleVerified:
        false,
      sitemapSubmitted:
        false,
      indexedUrls: 0,
      lastCheckedAt: "",
    });

  async function load() {
    const res = await fetch(
      "/api/admin/growth-execution",
      {
        cache: "no-store",
      },
    );

    const payload =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      setMessage(
        payload?.error ||
          "تعذر تحميل Growth Execution.",
      );
      return;
    }

    setData(payload);
    setForm({
      searchConsoleVerified:
        Boolean(
          payload.indexing
            ?.searchConsoleVerified,
        ),
      sitemapSubmitted:
        Boolean(
          payload.indexing
            ?.sitemapSubmitted,
        ),
      indexedUrls:
        Number(
          payload.indexing
            ?.indexedUrls ||
            0,
        ),
      lastCheckedAt:
        payload.indexing
          ?.lastCheckedAt
          ? new Date(
              payload.indexing.lastCheckedAt,
            )
              .toISOString()
              .slice(0, 16)
          : "",
    });
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveEvidence() {
    const res = await fetch(
      "/api/admin/growth-execution",
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          ...form,
          lastCheckedAt:
            form.lastCheckedAt
              ? new Date(
                  form.lastCheckedAt,
                ).toISOString()
              : new Date().toISOString(),
        }),
      },
    );

    const payload =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      setMessage(
        payload?.error ||
          "تعذر حفظ Evidence.",
      );
      return;
    }

    setData(payload);
    setMessage(
      "تم حفظ Search/Indexing evidence.",
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <h1
          style={{
            margin:
              "0 0 6px",
            color:
              "#071a2b",
          }}
        >
          Growth Execution Closure
        </h1>
        <p style={muted}>
          البناء التقني مقفول. الشاشة دي تفرق بين حاجة ناقصة في النظام وحاجة مستنية واقع: Traffic، عميل مكتمل، منطقة خدمة حقيقية أو Evidence من Search Console.
        </p>
      </div>

      {message && (
        <div style={info}>
          {message}
        </div>
      )}

      <div style={heroGrid}>
        <Hero
          label="Implementation"
          value={
            data?.implementationStatus ||
            "..."
          }
          good={
            data?.implementationStatus ===
            "CLOSED"
          }
        />
        <Hero
          label="Execution"
          value={
            data?.executionStatus ||
            "..."
          }
          good={
            data?.executionStatus ===
            "FULLY_ACTIVE"
          }
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 9,
        }}
      >
        {(data?.stages || []).map(
          (stage) => (
            <article
              key={stage.key}
              style={stageCard}
            >
              <div>
                <span
                  style={{
                    ...pill,
                    ...statusStyle(
                      stage.status,
                    ),
                  }}
                >
                  {stage.status}
                </span>

                <h3
                  style={{
                    margin:
                      "7px 0 4px",
                    color:
                      "#0b2f49",
                  }}
                >
                  {stage.label}
                </h3>

                <p
                  style={{
                    ...muted,
                    marginBottom:
                      0,
                  }}
                >
                  {stage.detail}
                </p>
              </div>

              <a
                href={stage.href}
                style={action}
              >
                افتح المرحلة ←
              </a>
            </article>
          ),
        )}
      </div>

      <section style={card}>
        <h2 style={h2}>
          Search Console / Indexing Evidence
        </h2>

        <div style={warning}>
          ما تسجلش Indexed URLs بالتخمين أو من بحث `site:` فقط. استخدم Search Console كـsource of truth.
        </div>

        <div style={checks}>
          <label style={check}>
            <input
              type="checkbox"
              checked={
                form.searchConsoleVerified
              }
              disabled={
                !isSuperAdmin
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  searchConsoleVerified:
                    e.target
                      .checked,
                })
              }
            />
            Search Console ownership verified
          </label>

          <label style={check}>
            <input
              type="checkbox"
              checked={
                form.sitemapSubmitted
              }
              disabled={
                !isSuperAdmin
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  sitemapSubmitted:
                    e.target
                      .checked,
                })
              }
            />
            sitemap.xml submitted successfully
          </label>
        </div>

        <div style={formGrid}>
          <label style={field}>
            <span>
              Indexed URLs
            </span>
            <input
              type="number"
              min="0"
              value={
                form.indexedUrls
              }
              disabled={
                !isSuperAdmin
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  indexedUrls:
                    Number(
                      e.target
                        .value,
                    ),
                })
              }
              style={input}
            />
          </label>

          <label style={field}>
            <span>
              Last checked
            </span>
            <input
              type="datetime-local"
              value={
                form.lastCheckedAt
              }
              disabled={
                !isSuperAdmin
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  lastCheckedAt:
                    e.target
                      .value,
                })
              }
              style={input}
            />
          </label>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <a
            href={
              data?.indexing
                .sitemapUrl ||
              "https://ventic-pro.com/sitemap.xml"
            }
            target="_blank"
            rel="noreferrer"
            style={secondary}
          >
            sitemap.xml
          </a>
          <a
            href={
              data?.indexing
                .robotsUrl ||
              "https://ventic-pro.com/robots.txt"
            }
            target="_blank"
            rel="noreferrer"
            style={secondary}
          >
            robots.txt
          </a>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() =>
                void saveEvidence()
              }
              style={primary}
            >
              حفظ Evidence
            </button>
          )}
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>
          Current Reality
        </h2>

        <div style={metricGrid}>
          {Object.entries(
            data?.metrics || {},
          ).map(
            ([key, value]) => (
              <div
                key={key}
                style={metric}
              >
                <small>
                  {key}
                </small>
                <strong>
                  {value}
                </strong>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function Hero({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div
      style={{
        ...hero,
        background: good
          ? "#f0fdf4"
          : "#fff7ed",
        borderColor: good
          ? "#bbf7d0"
          : "#fed7aa",
        color: good
          ? "#166534"
          : "#9a3412",
      }}
    >
      <small>
        {label}
      </small>
      <strong>
        {value}
      </strong>
    </div>
  );
}

function statusStyle(
  status: string,
) {
  if (
    status === "PASS" ||
    status === "READY"
  ) {
    return {
      background: "#f0fdf4",
      color: "#166534",
    };
  }

  if (
    status ===
      "ACTION_REQUIRED" ||
    status ===
      "EVIDENCE_REQUIRED"
  ) {
    return {
      background: "#fef2f2",
      color: "#991b1b",
    };
  }

  return {
    background: "#fff7ed",
    color: "#9a3412",
  };
}

const muted: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.75,
};
const info: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1e40af",
  border:
    "1px solid #bfdbfe",
  borderRadius: 10,
  padding: 10,
};
const heroGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(240px,1fr))",
  gap: 9,
};
const hero: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 15,
  padding: 15,
  display: "grid",
  gap: 4,
};
const stageCard: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 14,
  padding: 13,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const pill: React.CSSProperties = {
  display:
    "inline-block",
  borderRadius: 999,
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
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
const card: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 15,
  padding: 14,
};
const h2: React.CSSProperties = {
  color: "#0b2f49",
  marginTop: 0,
};
const warning: React.CSSProperties = {
  background: "#fff7ed",
  border:
    "1px solid #fed7aa",
  color: "#9a3412",
  borderRadius: 10,
  padding: 10,
  marginBottom: 10,
};
const checks: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginBottom: 10,
};
const check: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#334155",
  fontWeight: 800,
};
const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 8,
  marginBottom: 10,
};
const field: React.CSSProperties = {
  display: "grid",
  gap: 5,
  color: "#475569",
  fontWeight: 800,
};
const input: React.CSSProperties = {
  minHeight: 40,
  border:
    "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 9px",
  background: "white",
  font: "inherit",
};
const primary: React.CSSProperties = {
  minHeight: 40,
  border: 0,
  borderRadius: 9,
  background: "#0b2f49",
  color: "white",
  padding: "8px 12px",
  fontWeight: 900,
};
const secondary: React.CSSProperties = {
  ...primary,
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  background: "#eef8fd",
  color: "#075985",
  border:
    "1px solid #bae6fd",
};
const metricGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(160px,1fr))",
  gap: 8,
};
const metric: React.CSSProperties = {
  border:
    "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  display: "grid",
  gap: 4,
};
