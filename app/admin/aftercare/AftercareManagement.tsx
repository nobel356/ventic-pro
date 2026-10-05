"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";

type Ticket = {
  id: string;
  kind: "MAINTENANCE" | "COMPLAINT";
  orderId: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  property: string | null;
  device: string | null;
  issue: string;
  status: string;
  costType: string;
  chargeAmount: number;
  appointmentAt: string | null;
  technicianId: string | null;
  technicianName: string | null;
  createdByCustomer: boolean;
  resolution: string | null;
  createdAt: string;
};

type Technician = {
  id: string;
  name: string;
};

const statusLabels: Record<string, string> = {
  OPEN: "مفتوحة",
  SCHEDULED: "تمت الجدولة",
  IN_PROGRESS: "جاري التنفيذ",
  RESOLVED: "تم الحل",
  CLOSED: "مغلقة",
};

const costLabels: Record<string, string> = {
  WARRANTY: "داخل الضمان",
  FREE: "زيارة مجانية",
  PAID: "مدفوعة",
};

export default function AftercareManagement({
  canManage,
}: {
  canManage: boolean;
}) {
  const router = useRouter();
  const [tickets, setTickets] =
    useState<Ticket[]>([]);
  const [technicians, setTechnicians] =
    useState<Technician[]>([]);
  const [filter, setFilter] =
    useState("OPEN");
  const [kind, setKind] =
    useState("ALL");
  const [editing, setEditing] =
    useState<Ticket | null>(null);
  const [form, setForm] = useState({
    status: "OPEN",
    costType: "WARRANTY",
    chargeAmount: "0",
    appointmentAt: "",
    technicianId: "",
    resolution: "",
  });
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
      const response = await fetch(
        "/api/admin/aftercare",
        {
          cache: "no-store",
        },
      );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تحميل ما بعد التركيب",
        );
      }

      setTickets([
        ...(data?.maintenance || []),
        ...(data?.complaints || []),
      ]);
      setTechnicians(
        data?.technicians || [],
      );
      setError("");
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تحميل ما بعد التركيب",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    return tickets.filter((ticket) => {
      const kindOk =
        kind === "ALL" ||
        ticket.kind === kind;
      const statusOk =
        filter === "ALL"
          ? true
          : filter === "OPEN"
            ? [
                "OPEN",
                "SCHEDULED",
                "IN_PROGRESS",
              ].includes(
                ticket.status,
              )
            : ticket.status ===
              filter;

      return kindOk && statusOk;
    });
  }, [tickets, filter, kind]);

  function startEdit(
    ticket: Ticket,
  ) {
    setEditing(ticket);
    setForm({
      status: ticket.status,
      costType: ticket.costType,
      chargeAmount: String(
        ticket.chargeAmount || 0,
      ),
      appointmentAt:
        ticket.appointmentAt
          ? new Date(
              ticket.appointmentAt,
            )
              .toISOString()
              .slice(0, 16)
          : "",
      technicianId:
        ticket.technicianId || "",
      resolution:
        ticket.resolution || "",
    });
    setMessage("");
    setError("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function save() {
    if (!editing) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/admin/aftercare",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            kind: editing.kind,
            id: editing.id,
            ...form,
            chargeAmount: Number(
              form.chargeAmount || 0,
            ),
            appointmentAt:
              form.appointmentAt ||
              null,
            technicianId:
              form.technicianId ||
              null,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تحديث التذكرة",
        );
      }

      setMessage(
        "تم تحديث التذكرة وربط الموعد بالفني تلقائيًا.",
      );
      setEditing(null);
      await load();
      router.refresh();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تحديث التذكرة",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      {editing && canManage && (
        <section style={cardStyle}>
          <div style={headStyle}>
            <div>
              <h2 style={{ margin: 0 }}>
                إدارة{" "}
                {editing.kind ===
                "MAINTENANCE"
                  ? "طلب الصيانة"
                  : "الشكوى"}
              </h2>
              <p style={mutedStyle}>
                {editing.orderNo} —{" "}
                {editing.customerName} —{" "}
                {editing.issue}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setEditing(null)
              }
              style={
                secondaryButtonStyle
              }
            >
              إلغاء
            </button>
          </div>

          <div style={gridStyle}>
            <Select
              label="الحالة"
              value={form.status}
              onChange={(value) =>
                setForm({
                  ...form,
                  status: value,
                })
              }
              options={Object.entries(
                statusLabels,
              )}
            />

            <Select
              label="التكلفة"
              value={form.costType}
              onChange={(value) =>
                setForm({
                  ...form,
                  costType: value,
                })
              }
              options={Object.entries(
                costLabels,
              )}
            />

            <label style={fieldStyle}>
              <span>
                قيمة الزيارة/الخدمة
              </span>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
                value={
                  form.chargeAmount
                }
                disabled={
                  form.costType !==
                  "PAID"
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    chargeAmount:
                      e.target.value,
                  })
                }
              />
            </label>

            <label style={fieldStyle}>
              <span>الفني</span>
              <select
                style={inputStyle}
                value={
                  form.technicianId
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    technicianId:
                      e.target.value,
                  })
                }
              >
                <option value="">
                  بدون تعيين
                </option>
                {technicians.map(
                  (tech) => (
                    <option
                      key={tech.id}
                      value={tech.id}
                    >
                      {tech.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label style={fieldStyle}>
              <span>موعد الزيارة</span>
              <input
                style={inputStyle}
                type="datetime-local"
                value={
                  form.appointmentAt
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    appointmentAt:
                      e.target.value,
                  })
                }
              />
            </label>

            <label style={fieldStyle}>
              <span>
                الحل / ملاحظات الإغلاق
              </span>
              <input
                style={inputStyle}
                value={
                  form.resolution
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    resolution:
                      e.target.value,
                  })
                }
              />
            </label>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            style={{
              ...primaryButtonStyle,
              marginTop: 12,
            }}
          >
            {saving
              ? "جاري الحفظ..."
              : "حفظ التحديث"}
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
            <h2 style={{ margin: 0 }}>
              مركز ما بعد التركيب
            </h2>
            <p style={mutedStyle}>
              الصيانة والشكاوى وإعادة الزيارة مرتبطة بنفس الطلب والعقار والجهاز والفني.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <select
              value={kind}
              onChange={(e) =>
                setKind(e.target.value)
              }
              style={filterStyle}
            >
              <option value="ALL">
                الكل
              </option>
              <option value="MAINTENANCE">
                الصيانة
              </option>
              <option value="COMPLAINT">
                الشكاوى
              </option>
            </select>

            <select
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value,
                )
              }
              style={filterStyle}
            >
              <option value="OPEN">
                المفتوحة
              </option>
              <option value="ALL">
                كل الحالات
              </option>
              {Object.entries(
                statusLabels,
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {loading ? (
          <p>جاري التحميل...</p>
        ) : visible.length === 0 ? (
          <p>
            لا توجد تذاكر في هذا التصنيف.
          </p>
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
                minWidth: 1200,
              }}
            >
              <thead>
                <tr>
                  <th>النوع</th>
                  <th>
                    الطلب / العميل
                  </th>
                  <th>
                    العقار / الجهاز
                  </th>
                  <th>المشكلة</th>
                  <th>الحالة</th>
                  <th>التكلفة</th>
                  <th>الفني</th>
                  <th>الموعد</th>
                  <th>المصدر</th>
                  {canManage && (
                    <th />
                  )}
                </tr>
              </thead>

              <tbody>
                {visible.map(
                  (ticket) => (
                    <tr
                      key={`${ticket.kind}:${ticket.id}`}
                    >
                      <td>
                        {ticket.kind ===
                        "MAINTENANCE"
                          ? "صيانة"
                          : "شكوى"}
                      </td>
                      <td>
                        <strong>
                          {ticket.orderNo}
                        </strong>
                        <small
                          style={{
                            display:
                              "block",
                            color:
                              "#64748b",
                          }}
                        >
                          {
                            ticket.customerName
                          }{" "}
                          —{" "}
                          {
                            ticket.customerPhone
                          }
                        </small>
                      </td>
                      <td>
                        {ticket.property ||
                          "-"}
                        {ticket.device && (
                          <small
                            style={{
                              display:
                                "block",
                              color:
                                "#64748b",
                            }}
                          >
                            {
                              ticket.device
                            }
                          </small>
                        )}
                      </td>
                      <td>
                        {ticket.issue}
                      </td>
                      <td>
                        {statusLabels[
                          ticket.status
                        ] ||
                          ticket.status}
                      </td>
                      <td>
                        {costLabels[
                          ticket.costType
                        ] ||
                          ticket.costType}
                        {ticket.costType ===
                          "PAID" && (
                          <small
                            style={{
                              display:
                                "block",
                            }}
                          >
                            {ticket.chargeAmount.toLocaleString(
                              "ar-EG",
                            )}{" "}
                            ج
                          </small>
                        )}
                      </td>
                      <td>
                        {ticket.technicianName ||
                          "-"}
                      </td>
                      <td>
                        {ticket.appointmentAt
                          ? new Date(
                              ticket.appointmentAt,
                            ).toLocaleString(
                              "ar-EG",
                            )
                          : "-"}
                      </td>
                      <td>
                        {ticket.createdByCustomer
                          ? "العميل"
                          : "الإدارة"}
                      </td>
                      {canManage && (
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              startEdit(
                                ticket,
                              )
                            }
                            style={
                              secondaryButtonStyle
                            }
                          >
                            إدارة
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <select
        style={inputStyle}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      >
        {options.map(
          ([
            optionValue,
            optionLabel,
          ]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          ),
        )}
      </select>
    </label>
  );
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
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 10,
  marginTop: 16,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 800,
  color: "#334155",
};

const inputStyle: CSSProperties = {
  minHeight: 42,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 10px",
  background: "white",
  font: "inherit",
  boxSizing: "border-box",
  width: "100%",
};

const filterStyle: CSSProperties = {
  ...inputStyle,
  width: "auto",
  minWidth: 150,
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 40,
  border: 0,
  borderRadius: 9,
  background: "#0f2d4a",
  color: "white",
  padding: "0 13px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 38,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
  color: "#0f2d4a",
  padding: "0 11px",
  fontWeight: 800,
  cursor: "pointer",
};

const mutedStyle: CSSProperties = {
  color: "#64748b",
  marginBottom: 0,
  lineHeight: 1.6,
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
