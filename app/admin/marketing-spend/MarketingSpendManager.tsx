"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

type Spend = {
  id: string;
  source: string;
  campaign: string;
  amount: number;
  spentAt: string;
  note: string;
  actorLabel: string;
  createdAt: string;
};

type CampaignSuggestion = {
  source: string;
  campaign: string;
};

function today() {
  const now = new Date();
  const offset =
    now.getTimezoneOffset() *
    60 *
    1000;

  return new Date(
    now.getTime() - offset,
  )
    .toISOString()
    .slice(0, 10);
}

function money(
  value: number,
) {
  return value.toLocaleString(
    "ar-EG",
    {
      maximumFractionDigits: 2,
    },
  );
}

export default function MarketingSpendManager({
  sources,
  campaigns,
}: {
  sources: string[];
  campaigns: CampaignSuggestion[];
}) {
  const [items, setItems] =
    useState<Spend[]>([]);
  const [source, setSource] =
    useState(
      sources[0] ||
        "Facebook",
    );
  const [campaign, setCampaign] =
    useState("");
  const [amount, setAmount] =
    useState("");
  const [spentAt, setSpentAt] =
    useState(today());
  const [note, setNote] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  async function load() {
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/admin/marketing-spend",
          {
            cache:
              "no-store",
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تحميل تكلفة الإعلانات",
        );
      }

      setItems(
        Array.isArray(data)
          ? data
          : [],
      );
      setError("");
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تحميل تكلفة الإعلانات",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sourceCampaigns =
    useMemo(
      () =>
        campaigns
          .filter(
            (item) =>
              !source ||
              item.source ===
                source,
          )
          .map(
            (item) =>
              item.campaign,
          )
          .filter(
            (
              value,
              index,
              array,
            ) =>
              array.indexOf(
                value,
              ) === index,
          ),
      [campaigns, source],
    );

  const total =
    items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.amount || 0,
        ),
      0,
    );

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/marketing-spend",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                source,
                campaign,
                amount:
                  Number(
                    amount,
                  ),
                spentAt,
                note,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تسجيل التكلفة",
        );
      }

      setAmount("");
      setNote("");
      setMessage(
        "تم تسجيل تكلفة الإعلان وإضافتها لتحليلات التسويق.",
      );
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تسجيل التكلفة",
      );
    } finally {
      setSaving(false);
    }
  }

  async function voidSpend(
    item: Spend,
  ) {
    const ok =
      window.confirm(
        `إلغاء تكلفة ${money(
          item.amount,
        )} ج — ${item.source}${
          item.campaign
            ? ` / ${item.campaign}`
            : ""
        }؟\n\nالسجل الأصلي سيبقى في الـAudit Log.`,
      );

    if (!ok) return;

    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/marketing-spend",
          {
            method:
              "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                id: item.id,
              }),
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر إلغاء السجل",
        );
      }

      setMessage(
        "تم إلغاء السجل مع الاحتفاظ بتاريخ العملية.",
      );
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إلغاء السجل",
      );
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <section style={cardStyle}>
        <h2
          style={{
            marginTop: 0,
          }}
        >
          تسجيل تكلفة
        </h2>

        <div style={gridStyle}>
          <label style={fieldStyle}>
            <span>
              المصدر
            </span>
            <input
              list="marketing-sources"
              value={source}
              onChange={(
                event,
              ) =>
                setSource(
                  event.target
                    .value,
                )
              }
              style={inputStyle}
              placeholder="Facebook"
            />
            <datalist id="marketing-sources">
              {sources.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  />
                ),
              )}
            </datalist>
          </label>

          <label style={fieldStyle}>
            <span>
              الحملة
            </span>
            <input
              list="marketing-campaigns"
              value={campaign}
              onChange={(
                event,
              ) =>
                setCampaign(
                  event.target
                    .value,
                )
              }
              style={inputStyle}
              placeholder="اختياري — مثال october_launch"
            />
            <datalist id="marketing-campaigns">
              {sourceCampaigns.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  />
                ),
              )}
            </datalist>
          </label>

          <label style={fieldStyle}>
            <span>
              التكلفة بالجنيه
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(
                event,
              ) =>
                setAmount(
                  event.target
                    .value,
                )
              }
              style={inputStyle}
              placeholder="500"
            />
          </label>

          <label style={fieldStyle}>
            <span>
              تاريخ الصرف
            </span>
            <input
              type="date"
              value={spentAt}
              onChange={(
                event,
              ) =>
                setSpentAt(
                  event.target
                    .value,
                )
              }
              style={inputStyle}
            />
          </label>
        </div>

        <label
          style={{
            ...fieldStyle,
            marginTop: 12,
          }}
        >
          <span>
            ملاحظة
          </span>
          <input
            value={note}
            onChange={(
              event,
            ) =>
              setNote(
                event.target.value,
              )
            }
            style={inputStyle}
            placeholder="اختياري — فاتورة Meta أو دفعة الحملة"
          />
        </label>

        <button
          type="button"
          disabled={
            saving ||
            !source.trim() ||
            !Number(amount) ||
            !spentAt
          }
          onClick={() =>
            void save()
          }
          style={{
            ...primaryButton,
            marginTop: 12,
            opacity:
              saving
                ? 0.65
                : 1,
          }}
        >
          {saving
            ? "جاري التسجيل..."
            : "تسجيل التكلفة"}
        </button>
      </section>

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

      <section style={cardStyle}>
        <div style={headStyle}>
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              سجل تكلفة الإعلانات
            </h2>
            <p style={mutedStyle}>
              إجمالي السجلات النشطة:{" "}
              <b>
                {money(
                  total,
                )}{" "}
                ج
              </b>
            </p>
          </div>
        </div>

        {loading ? (
          <p>
            جاري التحميل...
          </p>
        ) : items.length === 0 ? (
          <p
            style={{
              color:
                "#64748b",
            }}
          >
            لا توجد تكاليف مسجلة حتى الآن.
          </p>
        ) : (
          <div
            style={{
              overflowX:
                "auto",
              marginTop: 14,
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 900,
              }}
            >
              <thead>
                <tr>
                  <th>
                    التاريخ
                  </th>
                  <th>
                    المصدر
                  </th>
                  <th>
                    الحملة
                  </th>
                  <th>
                    التكلفة
                  </th>
                  <th>
                    الملاحظة
                  </th>
                  <th>
                    سجله
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td>
                        {new Date(
                          item.spentAt,
                        ).toLocaleDateString(
                          "ar-EG",
                        )}
                      </td>
                      <td>
                        <strong>
                          {
                            item.source
                          }
                        </strong>
                      </td>
                      <td>
                        {item.campaign ||
                          "مصدر عام"}
                      </td>
                      <td>
                        <b>
                          {money(
                            item.amount,
                          )}{" "}
                          ج
                        </b>
                      </td>
                      <td>
                        {item.note ||
                          "-"}
                      </td>
                      <td>
                        {
                          item.actorLabel
                        }
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            void voidSpend(
                              item,
                            )
                          }
                          style={
                            dangerButton
                          }
                        >
                          إلغاء
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  boxShadow:
    "0 8px 24px rgba(15,23,42,.05)",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 10,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#334155",
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  minHeight: 42,
  border:
    "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 10px",
  background: "white",
  font: "inherit",
  boxSizing:
    "border-box",
};

const primaryButton: CSSProperties = {
  minHeight: 42,
  border: 0,
  borderRadius: 9,
  background: "#0f2d4a",
  color: "white",
  padding: "0 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButton: CSSProperties = {
  minHeight: 36,
  border:
    "1px solid #fecaca",
  borderRadius: 8,
  background: "#fef2f2",
  color: "#991b1b",
  padding: "0 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const successStyle: CSSProperties = {
  padding: 11,
  borderRadius: 10,
  background: "#f0fdf4",
  border:
    "1px solid #bbf7d0",
  color: "#166534",
};

const errorStyle: CSSProperties = {
  padding: 11,
  borderRadius: 10,
  background: "#fef2f2",
  border:
    "1px solid #fecaca",
  color: "#991b1b",
};

const headStyle: CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const mutedStyle: CSSProperties = {
  color: "#64748b",
  marginBottom: 0,
};
