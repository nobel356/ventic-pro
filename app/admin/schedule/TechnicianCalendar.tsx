"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

type Technician = {
  id: string;
  name: string;
};

type OrderItem = {
  id: string;
  orderNo: string;
  technicianId?: string | null;
  customer?: { name?: string };
  area?: string | null;
  status: string;
};

type Slot = {
  id: string;
  technicianId: string;
  orderId?: string | null;
  startsAt: string;
  endsAt: string;
  technician: Technician;
  order?: {
    id: string;
    orderNo: string;
    customer?: { name?: string };
  } | null;
};

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString("ar-EG", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWeekDays(selected: string) {
  const base = new Date(`${selected}T12:00:00`);
  const day = base.getDay();
  const backToSaturday = (day + 1) % 7;
  const start = new Date(base);
  start.setDate(start.getDate() - backToSaturday);

  return Array.from({ length: 7 }, (_, index) => {
    const item = new Date(start);
    item.setDate(start.getDate() + index);
    return item;
  });
}

function rangeFor(selected: string, view: "day" | "week") {
  if (view === "day") {
    const start = new Date(`${selected}T00:00:00`);
    const end = new Date(`${selected}T00:00:00`);
    end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const days = getWeekDays(selected);
  const start = new Date(days[0]);
  start.setHours(0, 0, 0, 0);
  const end = new Date(days[6]);
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  return { start: start.toISOString(), end: end.toISOString() };
}

export default function TechnicianCalendar() {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [view, setView] = useState<"day" | "week">("day");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    technicianId: "",
    orderId: "",
    startsAt: `${todayKey()}T09:00`,
    endsAt: `${todayKey()}T11:00`,
  });

  async function load() {
    setLoading(true);
    setError("");

    try {
      const range = rangeFor(selectedDate, view);
      const query = new URLSearchParams(range);

      const [slotResponse, technicianResponse, orderResponse] =
        await Promise.all([
          fetch(`/api/technician-slots?${query.toString()}`, {
            cache: "no-store",
          }),
          fetch("/api/admin/technicians", { cache: "no-store" }),
          fetch("/api/admin/orders", { cache: "no-store" }),
        ]);

      const [slotData, technicianData, orderData] = await Promise.all([
        slotResponse.json(),
        technicianResponse.json(),
        orderResponse.json(),
      ]);

      if (!slotResponse.ok) {
        throw new Error(slotData?.error || "تعذر تحميل الجدول");
      }

      setSlots(Array.isArray(slotData?.slots) ? slotData.slots : []);
      setCanManage(Boolean(slotData?.canManage));
      setTechnicians(
        Array.isArray(technicianData) ? technicianData : [],
      );
      setOrders(Array.isArray(orderData) ? orderData : []);
    } catch (err: any) {
      setError(err?.message || "تعذر تحميل الجدول");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setForm((current) => ({
      ...current,
      startsAt: `${selectedDate}T09:00`,
      endsAt: `${selectedDate}T11:00`,
    }));
  }, [selectedDate]);

  useEffect(() => {
    void load();
  }, [selectedDate, view]);

  const visibleDays = useMemo(
    () =>
      view === "day"
        ? [new Date(`${selectedDate}T12:00:00`)]
        : getWeekDays(selectedDate),
    [selectedDate, view],
  );

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status !== "COMPLETED" &&
          order.status !== "CANCELLED",
      ),
    [orders],
  );

  async function createSlot() {
    setError("");
    setMessage("");

    if (!form.technicianId || !form.startsAt || !form.endsAt) {
      setError("اختر الفني ووقت البداية والنهاية.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/technician-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId: form.technicianId,
          orderId: form.orderId || null,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر إنشاء الموعد");
      }

      setMessage("تم إضافة الموعد للجدول.");
      await load();
    } catch (err: any) {
      setError(err?.message || "تعذر إنشاء الموعد");
    } finally {
      setSaving(false);
    }
  }

  async function removeSlot(id: string) {
    if (!window.confirm("حذف هذا الموعد من جدول الفني؟")) return;

    setError("");
    setMessage("");

    const response = await fetch(`/api/technician-slots/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data?.error || "تعذر حذف الموعد");
      return;
    }

    setMessage("تم حذف الموعد.");
    await load();
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>التقويم</h2>
            <p style={{ marginBottom: 0, color: "#64748b" }}>
              اختر يومًا أو أسبوعًا لمراجعة الحجوزات.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setView("day")}
              style={view === "day" ? activeButton : secondaryButton}
            >
              يومي
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              style={view === "week" ? activeButton : secondaryButton}
            >
              أسبوعي
            </button>
          </div>
        </div>
      </section>

      {canManage && (
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>إضافة موعد</h2>
          <p style={{ color: "#64748b" }}>
            النظام يرفض تلقائيًا أي حجز يتعارض مع موعد آخر لنفس الفني.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(200px,1fr))",
              gap: 10,
            }}
          >
            <label style={labelStyle}>
              <span>الفني</span>
              <select
                value={form.technicianId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    technicianId: event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="">اختر الفني</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              <span>الطلب (اختياري)</span>
              <select
                value={form.orderId}
                onChange={(event) =>
                  setForm({ ...form, orderId: event.target.value })
                }
                style={inputStyle}
              >
                <option value="">موعد بدون طلب</option>
                {activeOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNo} — {order.customer?.name || "-"}
                    {order.area ? ` — ${order.area}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              <span>من</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  setForm({ ...form, startsAt: event.target.value })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>إلى</span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) =>
                  setForm({ ...form, endsAt: event.target.value })
                }
                style={inputStyle}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void createSlot()}
            disabled={saving}
            className="button"
            style={{ marginTop: 14 }}
          >
            {saving ? "جاري الحفظ..." : "إضافة الموعد"}
          </button>
        </section>
      )}

      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={successStyle}>{message}</div>}

      <section style={cardStyle}>
        {loading ? (
          <p>جاري تحميل الجدول...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                view === "week"
                  ? "repeat(auto-fit,minmax(230px,1fr))"
                  : "1fr",
              gap: 12,
            }}
          >
            {visibleDays.map((day) => {
              const key = dateKey(day);
              const daySlots = slots.filter(
                (slot) => dateKey(slot.startsAt) === key,
              );

              return (
                <div
                  key={key}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: 14,
                    minHeight: 140,
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>{dayLabel(day)}</h3>

                  {daySlots.length === 0 ? (
                    <p style={{ color: "#94a3b8" }}>
                      لا توجد مواعيد.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: 9 }}>
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          style={{
                            border: "1px solid #dbeafe",
                            background: "#f8fbff",
                            borderRadius: 12,
                            padding: 11,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              alignItems: "flex-start",
                            }}
                          >
                            <div>
                              <strong style={{ color: "#0f2d4a" }}>
                                {slot.technician.name}
                              </strong>
                              <div
                                style={{
                                  marginTop: 4,
                                  color: "#475569",
                                }}
                              >
                                {timeLabel(slot.startsAt)} —{" "}
                                {timeLabel(slot.endsAt)}
                              </div>
                            </div>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() =>
                                  void removeSlot(slot.id)
                                }
                                style={deleteButton}
                              >
                                حذف
                              </button>
                            )}
                          </div>

                          {slot.order && (
                            <Link
                              href={`/admin/orders/${slot.order.id}`}
                              style={{
                                display: "block",
                                marginTop: 8,
                                color: "#075985",
                                fontWeight: 800,
                                textDecoration: "none",
                              }}
                            >
                              {slot.order.orderNo} —{" "}
                              {slot.order.customer?.name || ""}
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,.05)",
};

const inputStyle: CSSProperties = {
  minHeight: 42,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  padding: "0 10px",
  font: "inherit",
  boxSizing: "border-box",
  width: "100%",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 7,
  fontWeight: 800,
  color: "#334155",
};

const secondaryButton: CSSProperties = {
  minHeight: 42,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  color: "#0f2d4a",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 800,
};

const activeButton: CSSProperties = {
  ...secondaryButton,
  background: "#0f2d4a",
  color: "white",
  borderColor: "#0f2d4a",
};

const deleteButton: CSSProperties = {
  border: "1px solid #fecaca",
  borderRadius: 9,
  background: "#fff",
  color: "#b91c1c",
  padding: "5px 9px",
  cursor: "pointer",
  fontWeight: 800,
};

const errorStyle: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};

const successStyle: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
};
