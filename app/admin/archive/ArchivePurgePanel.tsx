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
    useState<string[]>([]);
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

  const allSelected =
    rows.length > 0 &&
    rows.every((row: any) =>
      selected.includes(
        row.id,
      ),
    );

  function toggle(
    id: string,
  ) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter(
            (value) =>
              value !== id,
          )
        : [
            ...current,
            id,
          ],
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelected([]);
      return;
    }

    setSelected(
      rows.map(
        (row: any) =>
          row.id,
      ),
    );
  }

  async function restoreSelected() {
    if (!selected.length) {
      return;
    }

    if (
      !window.confirm(
        `استرجاع ${selected.length.toLocaleString("ar-EG")} عنصر محدد؟`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    const failed: string[] =
      [];

    try {
      for (const id of selected) {
        const response =
          await fetch(
            `/api/admin/archive/${kind}/${id}`,
            {
              method: "POST",
            },
          );

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(
                () => ({}),
              );

          failed.push(
            data?.error ||
              id,
          );
        }
      }

      if (failed.length) {
        setError(
          `فشل استرجاع ${failed.length.toLocaleString("ar-EG")} عنصر: ${failed
            .slice(0, 5)
            .join(" • ")}`,
        );
      } else {
        setMessage(
          "تم استرجاع العناصر المحددة.",
        );
      }

      setSelected([]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function purgeSelected() {
    if (!selected.length) {
      return;
    }

    const confirm =
      window.prompt(
        `سيتم حذف ${selected.length.toLocaleString("ar-EG")} عنصر نهائيًا مع البيانات التابعة له.\n\nلا يمكن التراجع.\n\nاكتب: حذف نهائي`,
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

    const failed: string[] =
      [];

    try {
      for (const id of selected) {
        const response =
          await fetch(
            `/api/admin/archive/purge/${kind}/${id}`,
            {
              method:
                "DELETE",
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

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(
                () => ({}),
              );

          failed.push(
            data?.error ||
              id,
          );
        }
      }

      if (failed.length) {
        setError(
          `تعذر حذف ${failed.length.toLocaleString("ar-EG")} عنصر: ${failed
            .slice(0, 5)
            .join(" • ")}`,
        );
      } else {
        setMessage(
          "تم حذف العناصر المحددة نهائيًا.",
        );
      }

      setSelected([]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (
    !status?.isSuperAdmin
  ) {
    return null;
  }

  if (!status?.unlocked) {
    return (
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>
          إدارة جماعية للأرشيف
        </h2>
        <p style={mutedStyle}>
          افتح Archive Vault أولًا
          للاسترجاع أو الحذف النهائي
          الجماعي.
        </p>
        <button
          type="button"
          onClick={() =>
            void load()
          }
          style={secondaryStyle}
        >
          تحديث بعد فتح الخزنة
        </button>
      </section>
    );
  }

  return (
    <section style={dangerCard}>
      <div style={headStyle}>
        <div>
          <h2
            style={{
              margin: 0,
              color: "#991b1b",
            }}
          >
            إدارة جماعية داخل الأرشيف
          </h2>
          <p style={mutedStyle}>
            اختار أكثر من عنصر ثم
            استرجعهم مرة واحدة أو
            احذفهم نهائيًا.
          </p>
        </div>

        <select
          value={kind}
          onChange={(event) => {
            setKind(
              event.target
                .value as Kind,
            );
            setSelected([]);
            setMessage("");
            setError("");
          }}
          style={{
            ...inputStyle,
            maxWidth: 260,
          }}
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
      </div>

      <div style={toolbarStyle}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 800,
          }}
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
          />
          تحديد الكل
        </label>

        <span>
          المحدد:{" "}
          <strong>
            {selected.length}
          </strong>
        </span>

        <button
          type="button"
          disabled={
            busy ||
            !selected.length
          }
          onClick={() =>
            void restoreSelected()
          }
          style={restoreStyle}
        >
          استرجاع المحدد
        </button>

        <button
          type="button"
          disabled={
            busy ||
            !selected.length
          }
          onClick={() =>
            void purgeSelected()
          }
          style={deleteStyle}
        >
          حذف المحدد نهائيًا
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
          marginTop: 14,
        }}
      >
        {rows.length === 0 ? (
          <p style={mutedStyle}>
            لا توجد عناصر مؤرشفة
            في هذا القسم.
          </p>
        ) : (
          rows.map(
            (item: any) => (
              <label
                key={item.id}
                style={rowStyle}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(
                    item.id,
                  )}
                  onChange={() =>
                    toggle(
                      item.id,
                    )
                  }
                />

                <span>
                  <strong>
                    {itemLabel(
                      kind,
                      item,
                    )}
                  </strong>

                  {item.archivedAt && (
                    <small
                      style={{
                        display:
                          "block",
                        color:
                          "#64748b",
                        marginTop: 3,
                      }}
                    >
                      مؤرشف:{" "}
                      {new Date(
                        item.archivedAt,
                      ).toLocaleString(
                        "ar-EG",
                      )}
                    </small>
                  )}
                </span>
              </label>
            ),
          )
        )}
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

const headStyle: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
  padding: 12,
  borderRadius: 12,
  background: "white",
  border:
    "1px solid #e2e8f0",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 11,
  border:
    "1px solid #e2e8f0",
  borderRadius: 10,
  background: "white",
  cursor: "pointer",
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.8,
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

const secondaryStyle: React.CSSProperties = {
  minHeight: 40,
  border:
    "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
  color: "#0f2d4a",
  padding: "0 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const restoreStyle: React.CSSProperties = {
  minHeight: 40,
  border:
    "1px solid #86efac",
  borderRadius: 9,
  background: "#f0fdf4",
  color: "#166534",
  padding: "0 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const deleteStyle: React.CSSProperties = {
  minHeight: 40,
  border: 0,
  borderRadius: 9,
  background: "#b91c1c",
  color: "white",
  padding: "0 12px",
  fontWeight: 900,
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
