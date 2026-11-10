"use client";

import {
  useEffect,
  useState,
} from "react";

type Item = {
  id: string;
  kind: string;
  severity: string;
  status: string;
  title: string;
  detail: string | null;
  rootCause: string | null;
  resolution: string | null;
  relatedSha: string | null;
  occurredAt: string;
};

export default function OpsChangeLog() {
  const [items, setItems] =
    useState<Item[]>([]);
  const [message, setMessage] =
    useState("");
  const [form, setForm] =
    useState({
      kind: "CHANGE",
      severity: "LOW",
      status:
        "RESOLVED",
      title: "",
      detail: "",
      relatedSha: "",
      occurredAt: "",
    });

  async function load() {
    const res = await fetch(
      "/api/admin/ops-log",
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
          "تعذر تحميل السجل.",
      );
      return;
    }

    setItems(
      data?.items || [],
    );
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    const res = await fetch(
      "/api/admin/ops-log",
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
      setMessage(
        data?.error ||
          "تعذر الحفظ.",
      );
      return;
    }

    setForm({
      kind: "CHANGE",
      severity: "LOW",
      status:
        "RESOLVED",
      title: "",
      detail: "",
      relatedSha: "",
      occurredAt: "",
    });

    setMessage(
      "تم تسجيل الحدث.",
    );

    await load();
  }

  async function update(
    item: Item,
    status: string,
  ) {
    const rootCause =
      window.prompt(
        "Root cause (اختياري):",
        item.rootCause ||
          "",
      );
    const resolution =
      window.prompt(
        "Resolution (اختياري):",
        item.resolution ||
          "",
      );

    const res = await fetch(
      "/api/admin/ops-log",
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          status,
          rootCause,
          resolution,
        }),
      },
    );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      setMessage(
        data?.error ||
          "تعذر التحديث.",
      );
      return;
    }

    await load();
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
          Incident & Change Log
        </h1>
        <p style={muted}>
          أي Deployment مهم، Restore، Incident، Root Cause أو تصحيح Production يتسجل هنا بدل ما التاريخ يضيع في المحادثات.
        </p>
      </div>

      {message && (
        <div style={info}>
          {message}
        </div>
      )}

      <section style={card}>
        <h2 style={h2}>
          سجل حدث جديد
        </h2>

        <div style={grid}>
          <select
            value={
              form.kind
            }
            onChange={(e) =>
              setForm({
                ...form,
                kind:
                  e.target.value,
              })
            }
            style={input}
          >
            <option value="CHANGE">
              Change
            </option>
            <option value="INCIDENT">
              Incident
            </option>
          </select>

          <select
            value={
              form.severity
            }
            onChange={(e) =>
              setForm({
                ...form,
                severity:
                  e.target.value,
              })
            }
            style={input}
          >
            {[
              "LOW",
              "MEDIUM",
              "HIGH",
              "CRITICAL",
            ].map((value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ))}
          </select>

          <select
            value={
              form.status
            }
            onChange={(e) =>
              setForm({
                ...form,
                status:
                  e.target.value,
              })
            }
            style={input}
          >
            {[
              "OPEN",
              "MONITORING",
              "RESOLVED",
              "CLOSED",
            ].map((value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            value={
              form.occurredAt
            }
            onChange={(e) =>
              setForm({
                ...form,
                occurredAt:
                  e.target.value,
              })
            }
            style={input}
          />
        </div>

        <input
          value={form.title}
          onChange={(e) =>
            setForm({
              ...form,
              title:
                e.target.value,
            })
          }
          placeholder="عنوان الحدث"
          style={input}
        />

        <textarea
          rows={4}
          value={form.detail}
          onChange={(e) =>
            setForm({
              ...form,
              detail:
                e.target.value,
            })
          }
          placeholder="التفاصيل"
          style={{
            ...input,
            minHeight: 85,
            padding: 9,
          }}
        />

        <input
          value={
            form.relatedSha
          }
          onChange={(e) =>
            setForm({
              ...form,
              relatedSha:
                e.target.value,
            })
          }
          placeholder="Related Git SHA (اختياري)"
          style={input}
        />

        <button
          type="button"
          onClick={() =>
            void create()
          }
          style={button}
        >
          تسجيل
        </button>
      </section>

      <div
        style={{
          display: "grid",
          gap: 8,
        }}
      >
        {items.map(
          (item) => (
            <article
              key={item.id}
              style={{
                ...row,
                borderColor:
                  item.severity ===
                  "CRITICAL"
                    ? "#fecaca"
                    : "#dbe7ef",
              }}
            >
              <div>
                <div
                  style={{
                    display:
                      "flex",
                    gap: 6,
                    flexWrap:
                      "wrap",
                  }}
                >
                  <span style={pill}>
                    {item.kind}
                  </span>
                  <span style={pill}>
                    {
                      item.severity
                    }
                  </span>
                  <span style={pill}>
                    {
                      item.status
                    }
                  </span>
                </div>

                <h3
                  style={{
                    margin:
                      "7px 0 4px",
                    color:
                      "#0b2f49",
                  }}
                >
                  {item.title}
                </h3>

                <small
                  style={{
                    color:
                      "#64748b",
                  }}
                >
                  {new Date(
                    item.occurredAt,
                  ).toLocaleString(
                    "ar-EG",
                  )}
                  {item.relatedSha
                    ? " · " +
                      item.relatedSha.slice(
                        0,
                        12,
                      )
                    : ""}
                </small>

                {item.detail && (
                  <p style={muted}>
                    {
                      item.detail
                    }
                  </p>
                )}

                {item.rootCause && (
                  <p>
                    <strong>
                      Root cause:
                    </strong>{" "}
                    {
                      item.rootCause
                    }
                  </p>
                )}

                {item.resolution && (
                  <p>
                    <strong>
                      Resolution:
                    </strong>{" "}
                    {
                      item.resolution
                    }
                  </p>
                )}
              </div>

              <select
                value={
                  item.status
                }
                onChange={(e) =>
                  void update(
                    item,
                    e.target.value,
                  )
                }
                style={input}
              >
                {[
                  "OPEN",
                  "MONITORING",
                  "RESOLVED",
                  "CLOSED",
                ].map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ))}
              </select>
            </article>
          ),
        )}
      </div>
    </div>
  );
}

const muted: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.7,
};
const card: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 15,
  padding: 14,
  display: "grid",
  gap: 9,
};
const h2: React.CSSProperties = {
  color: "#0b2f49",
  marginTop: 0,
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 8,
};
const input: React.CSSProperties = {
  minHeight: 40,
  border:
    "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
  padding: "0 9px",
  font: "inherit",
};
const button: React.CSSProperties = {
  width: "fit-content",
  border: 0,
  borderRadius: 9,
  minHeight: 40,
  padding: "8px 12px",
  background: "#0b2f49",
  color: "white",
  fontWeight: 900,
};
const info: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1e40af",
  border:
    "1px solid #bfdbfe",
  borderRadius: 10,
  padding: 10,
};
const row: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 13,
  padding: 12,
  display: "flex",
  justifyContent:
    "space-between",
  gap: 12,
  alignItems:
    "flex-start",
  flexWrap: "wrap",
};
const pill: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 7px",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 10,
  fontWeight: 900,
};
