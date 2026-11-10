"use client";

import {
  useEffect,
  useState,
} from "react";

type RecordItem = {
  id: string;
  recordType: string;
  status: string;
  provider: string;
  providerRef: string | null;
  occurredAt: string;
  note: string | null;
};

type Payload = {
  records: RecordItem[];
  summary: {
    backupAgeHours:
      | number
      | null;
    backupFresh: boolean;
    restoreVerified: boolean;
    latestBackup:
      | RecordItem
      | null;
    latestRestore:
      | RecordItem
      | null;
  };
};

export default function DisasterRecoveryCenter() {
  const [data, setData] =
    useState<Payload | null>(
      null,
    );
  const [message, setMessage] =
    useState("");
  const [form, setForm] =
    useState({
      recordType:
        "BACKUP",
      status: "PASS",
      occurredAt: "",
      provider: "Neon",
      providerRef: "",
      note: "",
    });

  async function load() {
    const res = await fetch(
      "/api/admin/disaster-recovery",
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
          "تعذر تحميل DR Center.",
      );
      return;
    }

    setData(payload);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    const res = await fetch(
      "/api/admin/disaster-recovery",
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

    const payload =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      setMessage(
        payload?.error ||
          "تعذر الحفظ.",
      );
      return;
    }

    setMessage(
      "تم تسجيل DR evidence.",
    );

    setForm({
      recordType:
        "BACKUP",
      status: "PASS",
      occurredAt: "",
      provider: "Neon",
      providerRef: "",
      note: "",
    });

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
          Backup & DR Center
        </h1>
        <p style={muted}>
          سجل Evidence حقيقي للـBackup والـRestore Drill. الصفحة لا تدّعي اتصالًا مباشرًا بـNeon API؛ أي Snapshot جديدة لازم تتسجل بعد التحقق منها.
        </p>
      </div>

      {message && (
        <div style={info}>
          {message}
        </div>
      )}

      <div style={stats}>
        <Stat
          label="Backup Freshness"
          value={
            data?.summary
              .backupFresh
              ? "PASS"
              : "STALE"
          }
          danger={
            !data?.summary
              .backupFresh
          }
        />
        <Stat
          label="Backup Age"
          value={
            data?.summary
              .backupAgeHours ===
            null ||
            data?.summary
              .backupAgeHours ===
              undefined
              ? "—"
              : data.summary
                    .backupAgeHours +
                "h"
          }
          danger={
            !data?.summary
              .backupFresh
          }
        />
        <Stat
          label="Restore Drill"
          value={
            data?.summary
              .restoreVerified
              ? "VERIFIED"
              : "NOT VERIFIED"
          }
          danger={
            !data?.summary
              .restoreVerified
          }
        />
      </div>

      {!data?.summary
        .backupFresh && (
        <div style={warning}>
          Backup freshness مش خضراء. ما تعتبرش Disaster Recovery مكتمل قبل وجود Snapshot حديثة ≤48 ساعة.
        </div>
      )}

      <section style={card}>
        <h2 style={h2}>
          سجل Evidence جديد
        </h2>

        <div style={grid}>
          <select
            value={
              form.recordType
            }
            onChange={(e) =>
              setForm({
                ...form,
                recordType:
                  e.target.value,
              })
            }
            style={input}
          >
            <option value="BACKUP">
              Backup
            </option>
            <option value="RESTORE_DRILL">
              Restore Drill
            </option>
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
            <option value="PASS">
              PASS
            </option>
            <option value="PARTIAL_PASS">
              PARTIAL PASS
            </option>
            <option value="FAIL">
              FAIL
            </option>
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

          <input
            value={
              form.providerRef
            }
            onChange={(e) =>
              setForm({
                ...form,
                providerRef:
                  e.target.value,
              })
            }
            placeholder="Snapshot / Drill reference"
            style={input}
          />
        </div>

        <textarea
          rows={4}
          value={form.note}
          onChange={(e) =>
            setForm({
              ...form,
              note:
                e.target.value,
            })
          }
          placeholder="Evidence / ملاحظات"
          style={{
            ...input,
            padding: 9,
            minHeight: 85,
          }}
        />

        <button
          type="button"
          onClick={() =>
            void create()
          }
          style={button}
        >
          حفظ
        </button>
      </section>

      <section style={card}>
        <h2 style={h2}>
          آخر السجلات
        </h2>

        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {(data?.records || []).map(
            (item) => (
              <div
                key={item.id}
                style={row}
              >
                <div>
                  <strong>
                    {
                      item.recordType
                    }{" "}
                    —{" "}
                    {
                      item.status
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
                    {new Date(
                      item.occurredAt,
                    ).toLocaleString(
                      "ar-EG",
                    )}
                    {item.providerRef
                      ? " · " +
                        item.providerRef
                      : ""}
                  </div>
                </div>

                {item.note && (
                  <small
                    style={{
                      color:
                        "#475569",
                      maxWidth:
                        620,
                    }}
                  >
                    {item.note}
                  </small>
                )}
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
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
      <small>
        {label}
      </small>
      <strong>
        {value}
      </strong>
    </div>
  );
}

const muted: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.75,
};
const stats: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 8,
};
const stat: React.CSSProperties = {
  border:
    "1px solid #dbe7ef",
  borderRadius: 13,
  padding: 12,
  display: "grid",
  gap: 4,
};
const card: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #dbe7ef",
  borderRadius: 15,
  padding: 14,
  display: "grid",
  gap: 10,
};
const h2: React.CSSProperties = {
  color: "#0b2f49",
  marginTop: 0,
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(200px,1fr))",
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
const row: React.CSSProperties = {
  border:
    "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  display: "flex",
  justifyContent:
    "space-between",
  gap: 10,
  flexWrap: "wrap",
};
