"use client";

import {
  useEffect,
  useState,
} from "react";

type Gate = {
  key: string;
  label: string;
  status:
    | "PASS"
    | "WARN"
    | "FAIL";
  value: string;
  detail: string;
};

type Payload = {
  status:
    | "GREEN"
    | "DEGRADED"
    | "BLOCKED";
  gates: Gate[];
  runtimeSha: string;
  expectedGithubSha: string;
  generatedAt: string;
};

export default function ProductionVerificationCenter() {
  const [data, setData] =
    useState<Payload | null>(
      null,
    );
  const [sha, setSha] =
    useState("");
  const [message, setMessage] =
    useState("");

  async function load() {
    const res = await fetch(
      "/api/admin/production-verification",
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
          "تعذر تحميل Production Verification.",
      );
      return;
    }

    setData(payload);
    setSha(
      payload
        .expectedGithubSha ||
        "",
    );
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSha() {
    const res = await fetch(
      "/api/admin/production-verification",
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          expectedGithubSha:
            sha,
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
          "تعذر حفظ SHA.",
      );
      return;
    }

    setMessage(
      "تم حفظ GitHub main SHA كـexternal evidence.",
    );

    await load();
  }

  const overall =
    data?.status ||
    "DEGRADED";

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
          Production Verification Center
        </h1>
        <p style={muted}>
          الحالة هنا مبنية على Evidence يمكن للنظام إثباتها. GitHub main نفسها External source؛ لو لم تسجل SHA تم التحقق منها، الحالة لن تصبح GREEN.
        </p>
      </div>

      {message && (
        <div style={info}>
          {message}
        </div>
      )}

      <div
        style={{
          ...hero,
          ...(overall ===
          "GREEN"
            ? {
                background:
                  "#f0fdf4",
                color:
                  "#166534",
                borderColor:
                  "#bbf7d0",
              }
            : overall ===
                "DEGRADED"
              ? {
                  background:
                    "#fff7ed",
                  color:
                    "#9a3412",
                  borderColor:
                    "#fed7aa",
                }
              : {
                  background:
                    "#fef2f2",
                  color:
                    "#991b1b",
                  borderColor:
                    "#fecaca",
                }),
        }}
      >
        <small>
          Production state
        </small>
        <strong>
          {overall}
        </strong>
      </div>

      <section style={card}>
        <h2 style={h2}>
          GitHub main Evidence
        </h2>

        <p style={muted}>
          بعد التحقق خارجيًا من GitHub main، الصق الـ40-character SHA هنا. النظام يقارنها تلقائيًا مع `VERCEL_GIT_COMMIT_SHA`.
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <input
            value={sha}
            onChange={(e) =>
              setSha(
                e.target.value,
              )
            }
            placeholder="40-character Git SHA"
            style={{
              ...input,
              flex: 1,
              minWidth: 280,
            }}
          />
          <button
            type="button"
            onClick={() =>
              void saveSha()
            }
            style={button}
          >
            حفظ Evidence
          </button>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gap: 8,
        }}
      >
        {(data?.gates || []).map(
          (gate) => (
            <article
              key={gate.key}
              style={row}
            >
              <div>
                <strong>
                  {
                    gate.label
                  }
                </strong>
                <div
                  style={{
                    color:
                      "#64748b",
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  {
                    gate.detail
                  }
                </div>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap: 8,
                  alignItems:
                    "center",
                }}
              >
                <strong>
                  {gate.value}
                </strong>
                <span
                  style={{
                    ...pill,
                    ...(gate.status ===
                    "PASS"
                      ? {
                          background:
                            "#f0fdf4",
                          color:
                            "#166534",
                        }
                      : gate.status ===
                          "WARN"
                        ? {
                            background:
                              "#fff7ed",
                            color:
                              "#9a3412",
                          }
                        : {
                            background:
                              "#fef2f2",
                            color:
                              "#991b1b",
                          }),
                  }}
                >
                  {
                    gate.status
                  }
                </span>
              </div>
            </article>
          ),
        )}
      </div>
    </div>
  );
}

const muted: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.75,
};
const hero: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 15,
  padding: 16,
  display: "grid",
  gap: 4,
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
const input: React.CSSProperties = {
  minHeight: 40,
  border:
    "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 9px",
  font: "inherit",
};
const button: React.CSSProperties = {
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
  borderRadius: 12,
  padding: 11,
  display: "flex",
  justifyContent:
    "space-between",
  gap: 10,
  flexWrap: "wrap",
};
const pill: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
};
