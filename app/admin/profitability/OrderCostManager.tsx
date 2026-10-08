"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
} from "react";

type OrderOption = {
  id: string;
  orderNo: string;
  customerName: string;
};

type CostItem = {
  id: string;
  orderId: string;
  category: string;
  categoryLabel: string;
  amount: number;
  occurredAt: string;
  note: string;
  actorLabel: string;
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

export default function OrderCostManager({
  orders,
  costs,
}: {
  orders: OrderOption[];
  costs: CostItem[];
}) {
  const [orderId, setOrderId] =
    useState(
      orders[0]?.id || "",
    );
  const [
    category,
    setCategory,
  ] = useState("LABOR");
  const [amount, setAmount] =
    useState("");
  const [
    occurredAt,
    setOccurredAt,
  ] = useState(today());
  const [note, setNote] =
    useState("");
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");

  const orderMap =
    useMemo(
      () =>
        new Map(
          orders.map(
            (order) => [
              order.id,
              order,
            ],
          ),
        ),
      [orders],
    );

  async function save() {
    setSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/order-costs",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                orderId,
                category,
                amount:
                  Number(
                    amount,
                  ),
                occurredAt,
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

      window.location.reload();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تسجيل التكلفة",
      );
      setSaving(false);
    }
  }

  async function voidCost(
    item: CostItem,
  ) {
    const order =
      orderMap.get(
        item.orderId,
      );

    const ok =
      window.confirm(
        `إلغاء ${item.categoryLabel} بقيمة ${money(
          item.amount,
        )} ج من ${
          order?.orderNo ||
          "الطلب"
        }؟\n\nالسجل الأصلي سيظل محفوظًا في Audit Log.`,
      );

    if (!ok) return;

    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/order-costs",
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
            "تعذر إلغاء التكلفة",
        );
      }

      window.location.reload();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إلغاء التكلفة",
      );
    }
  }

  return (
    <section style={cardStyle}>
      <h2
        style={{
          marginTop: 0,
        }}
      >
        تكاليف تشغيل يدوية
      </h2>
      <p style={mutedStyle}>
        استخدمها لتسجيل أجر التنفيذ أو الانتقال أو أي تكلفة مباشرة غير موجودة تلقائيًا في النظام.
      </p>

      {orders.length === 0 ? (
        <p>
          لا توجد طلبات في الفترة المختارة.
        </p>
      ) : (
        <>
          <div style={gridStyle}>
            <label style={fieldStyle}>
              <span>الطلب</span>
              <select
                value={orderId}
                onChange={(
                  event,
                ) =>
                  setOrderId(
                    event.target
                      .value,
                  )
                }
                style={inputStyle}
              >
                {orders.map(
                  (order) => (
                    <option
                      key={
                        order.id
                      }
                      value={
                        order.id
                      }
                    >
                      {
                        order.orderNo
                      }{" "}
                      —{" "}
                      {
                        order.customerName
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label style={fieldStyle}>
              <span>
                نوع التكلفة
              </span>
              <select
                value={category}
                onChange={(
                  event,
                ) =>
                  setCategory(
                    event.target
                      .value,
                  )
                }
                style={inputStyle}
              >
                <option value="LABOR">
                  أجر / تكلفة تنفيذ
                </option>
                <option value="TRANSPORT">
                  انتقال
                </option>
                <option value="OTHER">
                  تكلفة أخرى
                </option>
              </select>
            </label>

            <label style={fieldStyle}>
              <span>
                القيمة بالجنيه
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
                placeholder="250"
              />
            </label>

            <label style={fieldStyle}>
              <span>
                التاريخ
              </span>
              <input
                type="date"
                value={
                  occurredAt
                }
                onChange={(
                  event,
                ) =>
                  setOccurredAt(
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
              marginTop: 10,
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
                  event.target
                    .value,
                )
              }
              style={inputStyle}
              placeholder="اختياري"
            />
          </label>

          <button
            type="button"
            disabled={
              saving ||
              !orderId ||
              !Number(amount)
            }
            onClick={() =>
              void save()
            }
            style={{
              ...primaryButton,
              marginTop: 10,
            }}
          >
            {saving
              ? "جاري التسجيل..."
              : "تسجيل التكلفة"}
          </button>
        </>
      )}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {costs.length > 0 && (
        <div
          style={{
            overflowX: "auto",
            marginTop: 20,
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: 850,
            }}
          >
            <thead>
              <tr>
                <th>الطلب</th>
                <th>النوع</th>
                <th>القيمة</th>
                <th>التاريخ</th>
                <th>الملاحظة</th>
                <th>سجله</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {costs.map(
                (item) => {
                  const order =
                    orderMap.get(
                      item.orderId,
                    );

                  return (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td>
                        {order
                          ?.orderNo ||
                          "-"}
                      </td>
                      <td>
                        {
                          item.categoryLabel
                        }
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
                        {new Date(
                          item.occurredAt,
                        ).toLocaleDateString(
                          "ar-EG",
                        )}
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
                            void voidCost(
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
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
  minHeight: 34,
  border:
    "1px solid #fecaca",
  borderRadius: 8,
  background: "#fef2f2",
  color: "#991b1b",
  padding: "0 9px",
  fontWeight: 900,
  cursor: "pointer",
};

const mutedStyle: CSSProperties = {
  color: "#64748b",
  lineHeight: 1.7,
};

const errorStyle: CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  background: "#fef2f2",
  border:
    "1px solid #fecaca",
  color: "#991b1b",
};
