"use client";

import { useEffect, useMemo, useState } from "react";

type Status =
  | "TODO"
  | "IN_PROGRESS"
  | "SNOOZED"
  | "RESOLVED";

type Issue = {
  id: string;
  severity:
    | "CRITICAL"
    | "HIGH"
    | "MEDIUM"
    | "LOW";
  type:
    | "ARTICLE"
    | "AREA"
    | "INFRASTRUCTURE";
  title: string;
  detail: string;
  href: string;
  entity?: string;
  status: Status;
  ownerLabel: string | null;
  note: string | null;
  dueAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

type Payload = {
  health: {
    score: number;
    counts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  active: Issue[];
  resolved: Array<{
    issueKey: string;
    ownerLabel: string | null;
    resolvedAt: string | null;
  }>;
};

function severityRank(
  severity: Issue["severity"],
) {
  return {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  }[severity];
}

export default function SeoActionCenter() {
  const [data, setData] =
    useState<Payload | null>(
      null,
    );
  const [filter, setFilter] =
    useState<
      "ALL" | Status
    >("ALL");
  const [busyKey, setBusyKey] =
    useState("");
  const [message, setMessage] =
    useState("");

  async function load() {
    setMessage("");

    const res = await fetch(
      "/api/admin/seo-actions",
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
          "تعذر تحميل Action Center.",
      );
      return;
    }

    setData(payload);
  }

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(
    () =>
      [...(data?.active || [])]
        .filter(
          (item) =>
            filter === "ALL" ||
            item.status ===
              filter,
        )
        .sort(
          (a, b) =>
            severityRank(
              a.severity,
            ) -
              severityRank(
                b.severity,
              ) ||
            Number(
              Boolean(
                a.dueAt &&
                  new Date(
                    a.dueAt,
                  ).getTime() <
                    Date.now(),
              ),
            ) *
              -1,
        ),
    [data, filter],
  );

  async function update(
    issueKey: string,
    patch: Record<
      string,
      unknown
    >,
  ) {
    setBusyKey(issueKey);
    setMessage("");

    try {
      const res = await fetch(
        "/api/admin/seo-actions",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            issueKey,
            ...patch,
          }),
        },
      );

      const payload =
        await res
          .json()
          .catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "تعذر حفظ المهمة.",
        );
      }

      await load();
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر حفظ المهمة.",
      );
    } finally {
      setBusyKey("");
    }
  }

  const counts = {
    TODO:
      data?.active.filter(
        (item) =>
          item.status === "TODO",
      ).length || 0,
    IN_PROGRESS:
      data?.active.filter(
        (item) =>
          item.status ===
          "IN_PROGRESS",
      ).length || 0,
    SNOOZED:
      data?.active.filter(
        (item) =>
          item.status ===
          "SNOOZED",
      ).length || 0,
  };

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
              color: "#071a2b",
            }}
          >
            SEO Action Center
          </h1>
          <p style={muted}>
            حوّل مشاكل V44 إلى مهام تنفيذية. Resolved لا يتم اختيارها يدويًا؛ الفحص يقفل المهمة فقط بعد اختفاء المشكلة فعليًا.
          </p>
        </div>

        <div style={score}>
          <small>
            SEO Score
          </small>
          <strong>
            {data?.health.score ??
              "—"}
            /100
          </strong>
        </div>
      </div>

      {message && (
        <div style={warning}>
          {message}
        </div>
      )}

      <div style={stats}>
        <Stat
          label="To do"
          value={counts.TODO}
        />
        <Stat
          label="In progress"
          value={
            counts.IN_PROGRESS
          }
        />
        <Stat
          label="Snoozed"
          value={
            counts.SNOOZED
          }
        />
        <Stat
          label="Auto resolved"
          value={
            data?.resolved
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
          ["TODO", "To do"],
          [
            "IN_PROGRESS",
            "In progress",
          ],
          [
            "SNOOZED",
            "Snoozed",
          ],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              setFilter(
                value as
                  | "ALL"
                  | Status,
              )
            }
            style={{
              ...filterButton,
              ...(filter === value
                ? activeFilter
                : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={success}>
          مفيش Tasks مطابقة للفِلتر الحالي.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {rows.map((item) => {
            const overdue =
              Boolean(
                item.dueAt &&
                  new Date(
                    item.dueAt,
                  ).getTime() <
                    Date.now(),
              );

            return (
              <article
                key={item.id}
                style={{
                  ...card,
                  ...(item.severity ===
                  "CRITICAL"
                    ? criticalCard
                    : item.severity ===
                        "HIGH"
                      ? highCard
                      : {}),
                }}
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
                        style={badge}
                      >
                        {
                          item.severity
                        }
                      </span>
                      <span
                        style={
                          statusPill
                        }
                      >
                        {
                          item.status
                        }
                      </span>
                      {overdue && (
                        <span
                          style={
                            overduePill
                          }
                        >
                          متأخرة
                        </span>
                      )}
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
                    افتح مكان الإصلاح ←
                  </a>
                </div>

                <div style={editorGrid}>
                  <label style={field}>
                    <span>الحالة</span>
                    <select
                      value={
                        item.status
                      }
                      disabled={
                        busyKey ===
                        item.id
                      }
                      onChange={(
                        event,
                      ) =>
                        void update(
                          item.id,
                          {
                            status:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      style={input}
                    >
                      <option value="TODO">
                        To do
                      </option>
                      <option value="IN_PROGRESS">
                        In progress
                      </option>
                      <option value="SNOOZED">
                        Snoozed
                      </option>
                    </select>
                  </label>

                  <label style={field}>
                    <span>
                      المسؤول
                    </span>
                    <input
                      defaultValue={
                        item.ownerLabel ||
                        ""
                      }
                      placeholder="اسم المسؤول"
                      style={input}
                      onBlur={(
                        event,
                      ) =>
                        void update(
                          item.id,
                          {
                            ownerLabel:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    />
                  </label>

                  <label style={field}>
                    <span>
                      الموعد
                    </span>
                    <input
                      type="date"
                      defaultValue={
                        item.dueAt
                          ? new Date(
                              item.dueAt,
                            )
                              .toISOString()
                              .slice(
                                0,
                                10,
                              )
                          : ""
                      }
                      style={input}
                      onBlur={(
                        event,
                      ) =>
                        void update(
                          item.id,
                          {
                            dueAt:
                              event
                                .target
                                .value ||
                              null,
                          },
                        )
                      }
                    />
                  </label>
                </div>

                <label style={field}>
                  <span>
                    ملاحظة التنفيذ
                  </span>
                  <textarea
                    defaultValue={
                      item.note || ""
                    }
                    rows={3}
                    style={textarea}
                    placeholder="اكتب القرار أو الخطوة المطلوبة..."
                    onBlur={(
                      event,
                    ) =>
                      void update(
                        item.id,
                        {
                          note:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                  />
                </label>

                <small
                  style={{
                    color:
                      "#94a3b8",
                  }}
                >
                  أول ظهور:{" "}
                  {new Date(
                    item.firstSeenAt,
                  ).toLocaleDateString(
                    "ar-EG",
                  )}
                </small>
              </article>
            );
          })}
        </div>
      )}

      <div style={info}>
        بعد ما تصلح المشكلة، ارجع أو Refresh الصفحة. لو فحص V44 ما عادش شايف المشكلة، V45 هتقفلها تلقائيًا كـResolved. لو رجعت نفس المشكلة مستقبلًا، المهمة تتفتح تلقائيًا من جديد.
      </div>
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

const head: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};
const muted: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.75,
  maxWidth: 900,
};
const score: React.CSSProperties = {
  minWidth: 130,
  background: "#0b2f49",
  color: "white",
  borderRadius: 15,
  padding: 13,
  textAlign: "center",
  display: "grid",
  gap: 3,
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
const filterButton: React.CSSProperties = {
  border:
    "1px solid #cbd5e1",
  borderRadius: 999,
  background: "white",
  color: "#475569",
  padding: "7px 11px",
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
  gap: 13,
};
const criticalCard: React.CSSProperties = {
  borderColor: "#fecaca",
};
const highCard: React.CSSProperties = {
  borderColor: "#fed7aa",
};
const badge: React.CSSProperties = {
  borderRadius: 999,
  background: "#f1f5f9",
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
};
const statusPill: React.CSSProperties = {
  ...badge,
  background: "#eff6ff",
  color: "#1d4ed8",
};
const overduePill: React.CSSProperties = {
  ...badge,
  background: "#fef2f2",
  color: "#991b1b",
};
const editorGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 8,
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
const textarea: React.CSSProperties = {
  ...input,
  minHeight: 75,
  resize: "vertical",
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
const warning: React.CSSProperties = {
  background: "#fff7ed",
  border:
    "1px solid #fed7aa",
  color: "#9a3412",
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
const info: React.CSSProperties = {
  background: "#f8fafc",
  border:
    "1px solid #e2e8f0",
  color: "#475569",
  borderRadius: 11,
  padding: 11,
  lineHeight: 1.75,
};
