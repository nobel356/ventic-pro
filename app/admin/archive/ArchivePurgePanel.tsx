"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Kind =
  | "orders"
  | "users"
  | "customers"
  | "leads"
  | "suppliers"
  | "inventory";

const labels: Record<Kind, string> = {
  orders: "الطلبات",
  users: "المستخدمون",
  customers: "العملاء",
  leads: "Leads",
  suppliers: "الموردون",
  inventory: "أصناف المخزون",
};

function itemLabel(
  kind: Kind,
  item: any,
) {
  if (kind === "orders") {
    return item.orderNo;
  }

  if (
    kind === "users" ||
    kind === "customers" ||
    kind === "suppliers"
  ) {
    return item.name;
  }

  if (kind === "leads") {
    return (
      item.name ||
      item.phone ||
      "Lead"
    );
  }

  return `${item.sku} — ${item.nameAr}`;
}

export default function ArchivePurgePanel() {
  const [status, setStatus] =
    useState<any>(null);
  const [items, setItems] =
    useState<any>(null);
  const [kind, setKind] =
    useState<Kind>("orders");
  const [selected, setSelected] =
    useState("");
  const [busy, setBusy] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  async function load() {
    const statusResponse =
      await fetch(
        "/api/admin/archive/status",
        { cache: "no-store" },
      );
    const statusData =
      await statusResponse.json();

    setStatus(statusData);

    if (
      !statusResponse.ok ||
      !statusData?.isSuperAdmin ||
      !statusData?.unlocked
    ) {
      setItems(null);
      return;
    }

    const response =
      await fetch(
        "/api/admin/archive/items",
        { cache: "no-store" },
      );
    const data =
      await response.json();

    if (response.ok) {
      setItems(data);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(
    () =>
      Array.isArray(items?.[kind])
        ? items[kind]
        : [],
    [items, kind],
  );

  if (
    !status?.isSuperAdmin
  ) {
    return null;
  }

  if (!status?.unlocked) {
    return (
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>
          الحذف النهائي
        </h2>
        <p style={mutedStyle}>
          افتح Archive Vault أولًا
          لإدارة الحذف النهائي.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            minHeight: 40,
            border: "1px solid #cbd5e1",
            borderRadius: 9,
            background: "white",
            color: "#0f2d4a",
            padding: "0 12px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          تحديث بعد فتح الخزنة
        </button>
      </section>
    );
  }

  async function purge() {
    const item = rows.find(
      (row: any) =>
        row.id === selected,
    );

    if (!item) return;

    const label =
      itemLabel(kind, item);

    const confirm =
      window.prompt(
        `الحذف النهائي لا يمكن التراجع عنه.\n\nالعنصر: ${label}\n\nاكتب: حذف نهائي`,
      );

    if (
      confirm?.trim() !==
      "حذف نهائي"
    ) {
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/archive/purge/${kind}/${item.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                confirm:
                  "حذف نهائي",
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر الحذف النهائي.",
        );
      }

      setMessage(
        `تم حذف ${label} نهائيًا.`,
      );
      setSelected("");
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر الحذف النهائي.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={dangerCard}>
      <h2
        style={{
          marginTop: 0,
          color: "#991b1b",
        }}
      >
        ⚠️ الحذف النهائي
      </h2>

      <p style={mutedStyle}>
        متاح لـ Super Admin فقط.
        العناصر المرتبطة بتاريخ مالي
        أو تشغيلي مهم يتم منع حذفها
        بدل إتلاف السجلات.
      </p>

      <div style={gridStyle}>
        <select
          value={kind}
          onChange={(event) => {
            setKind(
              event.target.value as Kind,
            );
            setSelected("");
            setMessage("");
            setError("");
          }}
          style={inputStyle}
        >
          {(
            Object.keys(
              labels,
            ) as Kind[]
          ).map((value) => (
            <option
              key={value}
              value={value}
            >
              {labels[value]}
            </option>
          ))}
        </select>

        <select
          value={selected}
          onChange={(event) =>
            setSelected(
              event.target.value,
            )
          }
          style={inputStyle}
        >
          <option value="">
            اختر عنصرًا مؤرشفًا
          </option>
          {rows.map((item: any) => (
            <option
              key={item.id}
              value={item.id}
            >
              {itemLabel(
                kind,
                item,
              )}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={
            busy || !selected
          }
          onClick={() =>
            void purge()
          }
          style={deleteStyle}
        >
          {busy
            ? "جاري الحذف..."
            : "حذف نهائي"}
        </button>
      </div>

      {message && (
        <div style={successStyle}>
          {message}
        </div>
      )}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
  marginTop: 16,
};

const dangerCard: React.CSSProperties = {
  ...cardStyle,
  border:
    "1px solid #fecaca",
  background: "#fffafa",
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.8,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 10,
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  border:
    "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  padding: "0 11px",
  font: "inherit",
};

const deleteStyle: React.CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 10,
  background: "#b91c1c",
  color: "white",
  fontWeight: 900,
  padding: "0 14px",
  cursor: "pointer",
};

const successStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 11,
  borderRadius: 10,
  background: "#f0fdf4",
  border:
    "1px solid #bbf7d0",
  color: "#166534",
};

const errorStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 11,
  borderRadius: 10,
  background: "#fef2f2",
  border:
    "1px solid #fecaca",
  color: "#991b1b",
};
