"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

type CustomerItem = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  hasAccount: boolean;
  orderCount: number;
  propertyCount: number;
  invoiceCount: number;
  totalBilled: number;
  totalDue: number;
  activeSessions: number;
  createdAt: string;
};

export default function CustomerManagement({
  canEdit,
}: {
  canEdit: boolean;
}) {
  const [customers, setCustomers] =
    useState<CustomerItem[]>([]);
  const [editing, setEditing] =
    useState<CustomerItem | null>(
      null,
    );
  const [search, setSearch] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");
  const [form, setForm] =
    useState({
      name: "",
      phone: "",
      active: true,
      password: "",
    });

  async function load() {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/customers",
        {
          cache: "no-store",
        },
      );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تحميل العملاء",
        );
      }

      setCustomers(
        data?.customers || [],
      );
      setError("");
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تحميل العملاء",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    if (!q) return customers;

    return customers.filter(
      (customer) =>
        `${customer.name} ${customer.phone}`
          .toLowerCase()
          .includes(q),
    );
  }, [customers, search]);

  function startEdit(
    customer: CustomerItem,
  ) {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      active: customer.active,
      password: "",
    });
    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({
      name: "",
      phone: "",
      active: true,
      password: "",
    });
  }

  async function save() {
    if (!editing) return;

    setMessage("");
    setError("");

    if (
      !form.name.trim() ||
      !form.phone.trim()
    ) {
      setError(
        "الاسم ورقم الموبايل مطلوبان.",
      );
      return;
    }

    if (
      form.password &&
      form.password.length < 6
    ) {
      setError(
        "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/customers/${editing.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر حفظ العميل",
        );
      }

      setMessage(
        "تم تحديث حساب العميل وتسجيل العملية في Audit Log.",
      );
      setEditing(null);
      setForm({
        name: "",
        phone: "",
        active: true,
        password: "",
      });
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر حفظ العميل",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 18,
      }}
    >
      {canEdit && editing && (
        <section style={cardStyle}>
          <div style={headStyle}>
            <div>
              <h2
                style={{
                  margin: 0,
                }}
              >
                تعديل حساب العميل
              </h2>
              <p style={mutedStyle}>
                تغيير كلمة المرور اختياري. لو تم تغييره يتم إنهاء جلسات العميل الحالية تلقائيًا.
              </p>
            </div>

            <button
              type="button"
              onClick={cancelEdit}
              style={
                secondaryButtonStyle
              }
            >
              إلغاء
            </button>
          </div>

          <div style={formGridStyle}>
            <label>
              <strong>الاسم</strong>
              <input
                style={inputStyle}
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
              />
            </label>

            <label>
              <strong>
                رقم الموبايل
              </strong>
              <input
                style={inputStyle}
                inputMode="numeric"
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              <strong>
                كلمة مرور جديدة
              </strong>
              <input
                style={inputStyle}
                type="password"
                minLength={6}
                value={
                  form.password
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    password:
                      event.target.value,
                  })
                }
                placeholder="اختياري — 6 أحرف على الأقل"
              />
            </label>

            <label>
              <strong>
                حالة الحساب
              </strong>
              <span
                style={toggleStyle}
              >
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      active:
                        event.target
                          .checked,
                    })
                  }
                />
                {form.active
                  ? "نشط"
                  : "موقوف"}
              </span>
            </label>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void save()
            }
            style={{
              ...primaryButtonStyle,
              marginTop: 14,
            }}
          >
            {saving
              ? "جاري الحفظ..."
              : "حفظ تعديلات العميل"}
          </button>
        </section>
      )}

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
              حسابات العملاء
            </h2>
            <p style={mutedStyle}>
              الحساب المسجل يظهر كـ "له حساب". العميل الذي له طلبات فقط بدون كلمة مرور يظهر "بدون حساب".
            </p>
          </div>

          <input
            style={{
              ...inputStyle,
              maxWidth: 320,
            }}
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="بحث بالاسم أو الموبايل"
          />
        </div>

        {loading ? (
          <p>
            جاري تحميل العملاء...
          </p>
        ) : visible.length === 0 ? (
          <p>لا توجد نتائج.</p>
        ) : (
          <div
            style={{
              overflowX: "auto",
              marginTop: 14,
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 1050,
              }}
            >
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>حالة الحساب</th>
                  <th>الطلبات</th>
                  <th>العقارات</th>
                  <th>الفواتير</th>
                  <th>إجمالي الفواتير</th>
                  <th>المتبقي</th>
                  <th>الجلسات</th>
                  {canEdit && <th />}
                </tr>
              </thead>

              <tbody>
                {visible.map(
                  (customer) => (
                    <tr key={customer.id}>
                      <td>
                        <strong>
                          {
                            customer.name
                          }
                        </strong>
                        <small
                          style={{
                            display:
                              "block",
                            color:
                              "#64748b",
                            marginTop: 3,
                          }}
                        >
                          {
                            customer.phone
                          }
                        </small>
                      </td>

                      <td>
                        <span
                          style={{
                            ...badgeStyle,
                            background:
                              !customer.active
                                ? "#fee2e2"
                                : customer.hasAccount
                                  ? "#dcfce7"
                                  : "#e2e8f0",
                            color:
                              !customer.active
                                ? "#991b1b"
                                : customer.hasAccount
                                  ? "#166534"
                                  : "#475569",
                          }}
                        >
                          {!customer.active
                            ? "موقوف"
                            : customer.hasAccount
                              ? "له حساب"
                              : "بدون حساب"}
                        </span>
                      </td>

                      <td>
                        {
                          customer.orderCount
                        }
                      </td>
                      <td>
                        {
                          customer.propertyCount
                        }
                      </td>
                      <td>
                        {
                          customer.invoiceCount
                        }
                      </td>
                      <td>
                        {money(
                          customer.totalBilled,
                        )}{" "}
                        ج
                      </td>
                      <td>
                        <strong
                          style={{
                            color:
                              customer.totalDue >
                              0
                                ? "#b91c1c"
                                : "#166534",
                          }}
                        >
                          {money(
                            customer.totalDue,
                          )}{" "}
                          ج
                        </strong>
                      </td>
                      <td>
                        {
                          customer.activeSessions
                        }
                      </td>

                      {canEdit && (
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              startEdit(
                                customer,
                              )
                            }
                            style={
                              secondaryButtonStyle
                            }
                          >
                            تعديل
                          </button>
                        </td>
                      )}
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

function money(value: number) {
  return Number(
    value || 0,
  ).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

const cardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  boxShadow:
    "0 8px 24px rgba(15,23,42,.05)",
};

const headStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 12,
  marginTop: 16,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  padding: "9px 11px",
  marginTop: 6,
  font: "inherit",
};

const toggleStyle: CSSProperties = {
  minHeight: 44,
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 11px",
  marginTop: 6,
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 42,
  border: 0,
  borderRadius: 10,
  background: "#0f2d4a",
  color: "white",
  padding: "0 15px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 38,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
  color: "#0f2d4a",
  padding: "0 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const mutedStyle: CSSProperties = {
  color: "#64748b",
  marginBottom: 0,
  lineHeight: 1.6,
};

const badgeStyle: CSSProperties = {
  display: "inline-block",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: 900,
};

const successStyle: CSSProperties = {
  padding: 11,
  borderRadius: 10,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
};

const errorStyle: CSSProperties = {
  padding: 11,
  borderRadius: 10,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};
