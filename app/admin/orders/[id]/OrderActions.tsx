"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = {
  NEW: "جديد",
  CONFIRMED: "تم التأكيد",
  ASSIGNED: "تم تعيين فني",
  ON_THE_WAY: "في الطريق",
  ARRIVED: "وصل",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

const standardTimes = [
  "10 ص - 1 م",
  "1 م - 4 م",
  "4 م - 7 م",
  "7 م - 10 م",
];

export default function OrderActions({
  orderId,
  currentStatus,
  technicianId,
  preferredDate,
  preferredTime,
  technicians,
}: {
  orderId: string;
  currentStatus: string;
  technicianId?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  technicians: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [date, setDate] = useState(preferredDate || "");
  const [time, setTime] = useState(preferredTime || "");

  async function request(
    url: string,
    body: any,
    successMessage = "تم الحفظ بنجاح",
  ) {
    setLoading(true);
    setMessage("");
    setMessageError(false);

    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ");
      }

      setMessage(successMessage);
      setMessageError(false);
      router.refresh();
      return true;
    } catch (e: any) {
      setMessage(e.message || "تعذر تنفيذ العملية");
      setMessageError(true);
      return false;
    } finally {
      setLoading(false);
    }
  }

  const hasCustomTime =
    Boolean(time) && !standardTimes.includes(time);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        marginTop: 24,
      }}
    >
      <h2 style={{ marginTop: 0 }}>إدارة الطلب</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 16,
        }}
      >
        <label>
          <strong>حالة الطلب</strong>

          <select
            disabled={loading}
            defaultValue={currentStatus}
            onChange={(e) =>
              void request(
                `/api/admin/orders/${orderId}`,
                { status: e.target.value },
                "تم تحديث حالة الطلب",
              )
            }
            style={fieldStyle}
          >
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <strong>الفني المسؤول</strong>

          <select
            disabled={loading}
            defaultValue={technicianId || ""}
            onChange={(e) => {
              if (!e.target.value) return;

              void request(
                `/api/admin/orders/${orderId}/assign`,
                {
                  technicianId: e.target.value,
                },
                "تم تعيين الفني وإنشاء الموعد تلقائيًا في جدول الفنيين",
              );
            }}
            style={fieldStyle}
          >
            <option value="">غير معين</option>

            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>

          <small
            style={{
              display: "block",
              color: "#64748b",
              marginTop: 6,
            }}
          >
            عند اختيار الفني يتم حجز موعد الطلب تلقائيًا بعد فحص التعارض.
          </small>
        </label>

        <label>
          <strong>تاريخ الموعد</strong>
          <input
            type="date"
            value={date}
            disabled={loading}
            onChange={(event) => setDate(event.target.value)}
            style={fieldStyle}
          />
        </label>

        <label>
          <strong>فترة الموعد</strong>
          <select
            value={time}
            disabled={loading}
            onChange={(event) => setTime(event.target.value)}
            style={fieldStyle}
          >
            <option value="">اختر الفترة</option>
            {hasCustomTime && <option value={time}>{time}</option>}
            {standardTimes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={loading || !date || !time}
        onClick={() =>
          void request(
            `/api/admin/orders/${orderId}`,
            {
              preferredDate: date,
              preferredTime: time,
            },
            technicianId
              ? "تم تحديث الموعد وتحديث جدول الفني تلقائيًا"
              : "تم تحديث موعد الطلب",
          )
        }
        style={{
          marginTop: 16,
          border: 0,
          borderRadius: 10,
          background: "#0f2d4a",
          color: "white",
          minHeight: 42,
          padding: "0 16px",
          fontWeight: 800,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        حفظ الموعد
      </button>

      {message && (
        <p
          style={{
            marginBottom: 0,
            marginTop: 14,
            fontWeight: 700,
            color: messageError ? "#b91c1c" : "#166534",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  minHeight: 44,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  background: "white",
  font: "inherit",
};
