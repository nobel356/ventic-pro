"use client";

import {
  useEffect,
  useState,
} from "react";

type Article = {
  slug: string;
  title: string;
};

type Experiment = {
  id: string;
  name: string;
  articleSlug: string;
  status:
    | "DRAFT"
    | "RUNNING"
    | "STOPPED";
  controlLabel: string;
  variantLabel: string;
  createdAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
  metrics: {
    controlExposures: number;
    controlClicks: number;
    controlOrders: number;
    variantExposures: number;
    variantClicks: number;
    variantOrders: number;
    controlCtr: number;
    variantCtr: number;
    uplift: number;
    pValue: number;
    enoughSample: boolean;
    significant: boolean;
    winner:
      | "CONTROL"
      | "VARIANT"
      | null;
  };
};

export default function CroExperimentCenter() {
  const [
    experiments,
    setExperiments,
  ] = useState<
    Experiment[]
  >([]);
  const [articles, setArticles] =
    useState<Article[]>([]);
  const [message, setMessage] =
    useState("");
  const [busy, setBusy] =
    useState(false);
  const [form, setForm] =
    useState({
      name: "",
      articleSlug: "",
      controlLabel:
        "شوف الخدمة",
      variantLabel:
        "اطلب تقييم المكان",
    });

  async function load() {
    const res = await fetch(
      "/api/admin/cro-experiments",
      {
        cache: "no-store",
      },
    );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      setMessage(
        data?.error ||
          "تعذر تحميل التجارب.",
      );
      return;
    }

    setExperiments(
      data?.experiments || [],
    );
    setArticles(
      data?.articles || [],
    );
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch(
        "/api/admin/cro-experiments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            form,
          ),
        },
      );

      const data =
        await res
          .json()
          .catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "تعذر إنشاء التجربة.",
        );
      }

      setForm({
        name: "",
        articleSlug: "",
        controlLabel:
          "شوف الخدمة",
        variantLabel:
          "اطلب تقييم المكان",
      });

      setMessage(
        "تم إنشاء التجربة كـDraft.",
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر إنشاء التجربة.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function action(
    id: string,
    action:
      | "START"
      | "STOP",
  ) {
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch(
        "/api/admin/cro-experiments",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
            action,
          }),
        },
      );

      const data =
        await res
          .json()
          .catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "تعذر تنفيذ الأمر.",
        );
      }

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر تنفيذ الأمر.",
      );
    } finally {
      setBusy(false);
    }
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
            color: "#071a2b",
            margin:
              "0 0 6px",
          }}
        >
          CRO Experiment Center
        </h1>
        <p style={muted}>
          اختبر نص CTA الرئيسي للمقال 50/50. النظام لا يعلن Winner قبل حجم عينة كافٍ ودلالة إحصائية تقريبية.
        </p>
      </div>

      {message && (
        <div style={info}>
          {message}
        </div>
      )}

      <section style={card}>
        <h2 style={h2}>
          تجربة جديدة
        </h2>

        <div style={grid}>
          <label style={field}>
            <span>
              اسم التجربة
            </span>
            <input
              value={form.name}
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,
                  name:
                    event.target
                      .value,
                })
              }
              style={input}
              placeholder="CTA wording test"
            />
          </label>

          <label style={field}>
            <span>المقال</span>
            <select
              value={
                form.articleSlug
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,
                  articleSlug:
                    event.target
                      .value,
                })
              }
              style={input}
            >
              <option value="">
                اختر مقال...
              </option>
              {articles.map(
                (article) => (
                  <option
                    key={
                      article.slug
                    }
                    value={
                      article.slug
                    }
                  >
                    {
                      article.title
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label style={field}>
            <span>
              Control CTA
            </span>
            <input
              value={
                form.controlLabel
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,
                  controlLabel:
                    event.target
                      .value,
                })
              }
              style={input}
            />
          </label>

          <label style={field}>
            <span>
              Variant CTA
            </span>
            <input
              value={
                form.variantLabel
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,
                  variantLabel:
                    event.target
                      .value,
                })
              }
              style={input}
            />
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void create()
          }
          style={primary}
        >
          إنشاء Draft
        </button>
      </section>

      <section style={card}>
        <h2 style={h2}>
          التجارب
        </h2>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {experiments.length ===
          0 ? (
            <p style={muted}>
              لا توجد تجارب حتى الآن.
            </p>
          ) : (
            experiments.map(
              (item) => {
                const decision =
                  !item.metrics
                    .enoughSample
                    ? "جمع بيانات"
                    : item.metrics
                          .significant
                      ? item
                            .metrics
                            .winner ===
                          "VARIANT"
                        ? "Variant Winner"
                        : "Control Winner"
                      : "No significant winner";

                return (
                  <article
                    key={
                      item.id
                    }
                    style={
                      experimentCard
                    }
                  >
                    <div
                      style={
                        head
                      }
                    >
                      <div>
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 7,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <span
                            style={
                              statusPill
                            }
                          >
                            {
                              item.status
                            }
                          </span>

                          <span
                            style={
                              decisionPill
                            }
                          >
                            {
                              decision
                            }
                          </span>
                        </div>

                        <h3
                          style={{
                            color:
                              "#0b2f49",
                            margin:
                              "7px 0 3px",
                          }}
                        >
                          {
                            item.name
                          }
                        </h3>

                        <small
                          style={{
                            color:
                              "#64748b",
                          }}
                        >
                          /blog/
                          {
                            item.articleSlug
                          }
                        </small>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: 7,
                        }}
                      >
                        {item.status ===
                          "DRAFT" && (
                          <button
                            disabled={
                              busy
                            }
                            onClick={() =>
                              void action(
                                item.id,
                                "START",
                              )
                            }
                            style={
                              primary
                            }
                          >
                            Start
                          </button>
                        )}

                        {item.status ===
                          "RUNNING" && (
                          <button
                            disabled={
                              busy
                            }
                            onClick={() =>
                              void action(
                                item.id,
                                "STOP",
                              )
                            }
                            style={
                              secondary
                            }
                          >
                            Stop
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      style={
                        variantGrid
                      }
                    >
                      <VariantBox
                        name="Control"
                        label={
                          item.controlLabel
                        }
                        exposures={
                          item.metrics
                            .controlExposures
                        }
                        clicks={
                          item.metrics
                            .controlClicks
                        }
                        orders={
                          item.metrics
                            .controlOrders
                        }
                        ctr={
                          item.metrics
                            .controlCtr
                        }
                      />

                      <VariantBox
                        name="Variant"
                        label={
                          item.variantLabel
                        }
                        exposures={
                          item.metrics
                            .variantExposures
                        }
                        clicks={
                          item.metrics
                            .variantClicks
                        }
                        orders={
                          item.metrics
                            .variantOrders
                        }
                        ctr={
                          item.metrics
                            .variantCtr
                        }
                      />
                    </div>

                    <div style={statsRow}>
                      <Metric
                        label="Uplift"
                        value={
                          item.metrics
                            .uplift +
                          "%"
                        }
                      />
                      <Metric
                        label="p-value"
                        value={
                          item.metrics
                            .pValue
                        }
                      />
                      <Metric
                        label="Sample ready"
                        value={
                          item.metrics
                            .enoughSample
                            ? "Yes"
                            : "No"
                        }
                      />
                    </div>
                  </article>
                );
              },
            )
          )}
        </div>
      </section>

      <div style={warning}>
        لا توقف تجربة لمجرد أن Variant متقدم مبكرًا. قبل 50 Exposure لكل Variant و10 Clicks إجمالًا، النتيجة تعتبر غير ناضجة.
      </div>
    </div>
  );
}

function VariantBox({
  name,
  label,
  exposures,
  clicks,
  orders,
  ctr,
}: {
  name: string;
  label: string;
  exposures: number;
  clicks: number;
  orders: number;
  ctr: number;
}) {
  return (
    <div style={variantBox}>
      <small
        style={{
          color: "#64748b",
        }}
      >
        {name}
      </small>
      <strong
        style={{
          color: "#0b2f49",
        }}
      >
        {label}
      </strong>
      <div style={statsRow}>
        <Metric
          label="Exposure"
          value={exposures}
        />
        <Metric
          label="Clicks"
          value={clicks}
        />
        <Metric
          label="CTR"
          value={ctr + "%"}
        />
        <Metric
          label="Orders"
          value={orders}
        />
      </div>
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
      <small>
        {label}
      </small>
      <strong>
        {value}
      </strong>
    </span>
  );
}

const muted: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.75,
};
const card: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 16,
  padding: 16,
};
const h2: React.CSSProperties = {
  color: "#0b2f49",
  marginTop: 0,
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 9,
  marginBottom: 11,
};
const field: React.CSSProperties = {
  display: "grid",
  gap: 5,
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
};
const input: React.CSSProperties = {
  minHeight: 40,
  border:
    "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "7px 9px",
  background: "white",
  font: "inherit",
};
const primary: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  background: "#0b2f49",
  color: "white",
  minHeight: 40,
  padding: "8px 12px",
  fontWeight: 900,
  cursor: "pointer",
};
const secondary: React.CSSProperties = {
  ...primary,
  background: "#eef8fd",
  color: "#075985",
  border:
    "1px solid #bae6fd",
};
const experimentCard: React.CSSProperties = {
  border:
    "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 13,
  display: "grid",
  gap: 11,
};
const head: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};
const statusPill: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 7px",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 10,
  fontWeight: 900,
};
const decisionPill: React.CSSProperties = {
  ...statusPill,
  background: "#eff6ff",
  color: "#1d4ed8",
};
const variantGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(260px,1fr))",
  gap: 9,
};
const variantBox: React.CSSProperties = {
  background: "#f8fafc",
  border:
    "1px solid #e2e8f0",
  borderRadius: 11,
  padding: 11,
  display: "grid",
  gap: 6,
};
const statsRow: React.CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
};
const metric: React.CSSProperties = {
  minWidth: 74,
  display: "grid",
  gap: 2,
  border:
    "1px solid #e2e8f0",
  background: "white",
  borderRadius: 8,
  padding: "6px 8px",
};
const info: React.CSSProperties = {
  background: "#eff6ff",
  border:
    "1px solid #bfdbfe",
  color: "#1e40af",
  borderRadius: 10,
  padding: 10,
};
const warning: React.CSSProperties = {
  background: "#fff7ed",
  border:
    "1px solid #fed7aa",
  color: "#9a3412",
  borderRadius: 10,
  padding: 10,
  lineHeight: 1.7,
};
