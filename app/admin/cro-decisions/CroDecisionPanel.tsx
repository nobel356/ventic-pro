"use client";

import {
  useEffect,
  useState,
} from "react";

type Experiment = {
  id: string;
  name: string;
  articleSlug: string;
  status:
    | "DRAFT"
    | "RUNNING"
    | "STOPPED"
    | "DECIDED"
    | "ROLLED_OUT"
    | "ROLLED_BACK";
  controlLabel: string;
  variantLabel: string;
  decision: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  decidedByLabel: string | null;
  previousServiceLabel:
    | string
    | null;
  appliedServiceLabel:
    | string
    | null;
  rolledOutAt:
    | string
    | null;
  rolledBackAt:
    | string
    | null;
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

export default function CroDecisionPanel() {
  const [items, setItems] =
    useState<Experiment[]>([]);
  const [busy, setBusy] =
    useState("");
  const [message, setMessage] =
    useState("");

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

    setItems(
      data?.experiments || [],
    );
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(
    id: string,
    action:
      | "ADOPT_WINNER"
      | "RECORD_NO_WINNER"
      | "ROLLBACK",
  ) {
    const note =
      action ===
      "ROLLBACK"
        ? null
        : window.prompt(
            "ملاحظة القرار (اختياري):",
          );

    setBusy(id);
    setMessage("");

    try {
      const res = await fetch(
        "/api/admin/cro-decisions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
            action,
            note,
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
            "تعذر تنفيذ القرار.",
        );
      }

      setMessage(
        action ===
        "ADOPT_WINNER"
          ? "تم اعتماد الفائز وتطبيق CTA على المقال."
          : action ===
              "ROLLBACK"
            ? "تم Rollback بأمان."
            : "تم تسجيل No Winner.",
      );

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر تنفيذ القرار.",
      );
    } finally {
      setBusy("");
    }
  }

  const decisionItems =
    items.filter(
      (item) =>
        [
          "STOPPED",
          "DECIDED",
          "ROLLED_OUT",
          "ROLLED_BACK",
        ].includes(item.status),
    );

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
          Experiment Decisions
        </h1>
        <p style={muted}>
          القرار النهائي يظل يدويًا. النظام يثبت هل النتيجة مؤهلة إحصائيًا ثم يمنع Rollout أو Rollback غير الآمن.
        </p>
      </div>

      {message && (
        <div style={info}>
          {message}
        </div>
      )}

      {decisionItems.length ===
      0 ? (
        <div style={empty}>
          مفيش Experiments متوقفة أو محسومة لسه.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {decisionItems.map(
            (item) => {
              const eligible =
                item.status ===
                  "STOPPED" &&
                item.metrics
                  .enoughSample &&
                item.metrics
                  .significant &&
                Boolean(
                  item.metrics
                    .winner,
                );

              const noWinnerEligible =
                item.status ===
                  "STOPPED" &&
                !item.metrics
                  .significant;

              return (
                <article
                  key={
                    item.id
                  }
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
                        }}
                      >
                        <span
                          style={
                            status
                          }
                        >
                          {
                            item.status
                          }
                        </span>

                        {eligible && (
                          <span
                            style={
                              winner
                            }
                          >
                            Winner:{" "}
                            {
                              item
                                .metrics
                                .winner
                            }
                          </span>
                        )}
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
                        flexWrap:
                          "wrap",
                      }}
                    >
                      {eligible && (
                        <button
                          disabled={
                            busy ===
                            item.id
                          }
                          onClick={() =>
                            void act(
                              item.id,
                              "ADOPT_WINNER",
                            )
                          }
                          style={
                            primary
                          }
                        >
                          Adopt Winner
                        </button>
                      )}

                      {noWinnerEligible && (
                        <button
                          disabled={
                            busy ===
                            item.id
                          }
                          onClick={() =>
                            void act(
                              item.id,
                              "RECORD_NO_WINNER",
                            )
                          }
                          style={
                            secondary
                          }
                        >
                          Record No Winner
                        </button>
                      )}

                      {item.status ===
                        "ROLLED_OUT" && (
                        <button
                          disabled={
                            busy ===
                            item.id
                          }
                          onClick={() =>
                            void act(
                              item.id,
                              "ROLLBACK",
                            )
                          }
                          style={
                            danger
                          }
                        >
                          Safe Rollback
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={grid}>
                    <Box
                      title="Control"
                      label={
                        item.controlLabel
                      }
                      ctr={
                        item.metrics
                          .controlCtr
                      }
                      orders={
                        item.metrics
                          .controlOrders
                      }
                    />
                    <Box
                      title="Variant"
                      label={
                        item.variantLabel
                      }
                      ctr={
                        item.metrics
                          .variantCtr
                      }
                      orders={
                        item.metrics
                          .variantOrders
                      }
                    />
                  </div>

                  <div style={metrics}>
                    <Metric
                      label="p-value"
                      value={
                        item.metrics
                          .pValue
                      }
                    />
                    <Metric
                      label="Uplift"
                      value={
                        item.metrics
                          .uplift +
                        "%"
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

                  {item.decision && (
                    <div style={learning}>
                      <strong>
                        Learning
                      </strong>
                      <span>
                        Decision:{" "}
                        {
                          item.decision
                        }
                      </span>
                      {item.decisionNote && (
                        <span>
                          {
                            item.decisionNote
                          }
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            },
          )}
        </div>
      )}

      <div style={warning}>
        Orders هنا Secondary metric فقط. قرار Winner في V48 يعتمد على CTR significance لأن حجم Orders غالبًا صغير. ما تعتبرش فرق Orders وحده دليل كافي.
      </div>
    </div>
  );
}

function Box({
  title,
  label,
  ctr,
  orders,
}: {
  title: string;
  label: string;
  ctr: number;
  orders: number;
}) {
  return (
    <div style={box}>
      <small>
        {title}
      </small>
      <strong>
        {label}
      </strong>
      <span>
        CTR {ctr}% · Orders{" "}
        {orders}
      </span>
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
const info: React.CSSProperties = {
  background: "#eff6ff",
  border:
    "1px solid #bfdbfe",
  color: "#1e40af",
  borderRadius: 10,
  padding: 10,
};
const empty: React.CSSProperties = {
  background: "#f8fafc",
  border:
    "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 14,
  color: "#64748b",
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
const head: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};
const status: React.CSSProperties = {
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
};
const winner: React.CSSProperties = {
  ...status,
  background: "#f0fdf4",
  color: "#166534",
};
const primary: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  minHeight: 39,
  padding: "8px 11px",
  background: "#0b2f49",
  color: "white",
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
const danger: React.CSSProperties = {
  ...primary,
  background: "#fff1f2",
  color: "#be123c",
  border:
    "1px solid #fecdd3",
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(240px,1fr))",
  gap: 8,
};
const box: React.CSSProperties = {
  background: "#f8fafc",
  border:
    "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  display: "grid",
  gap: 5,
  color: "#334155",
};
const metrics: React.CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
};
const metric: React.CSSProperties = {
  minWidth: 85,
  display: "grid",
  gap: 2,
  border:
    "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "6px 8px",
};
const learning: React.CSSProperties = {
  display: "grid",
  gap: 4,
  background: "#f0fdf4",
  border:
    "1px solid #bbf7d0",
  color: "#166534",
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
