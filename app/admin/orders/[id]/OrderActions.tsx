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

export default function OrderActions({
  orderId,
  currentStatus,
  technicianId,
  technicians,
}: {
  orderId: string;
  currentStatus: string;
  technicianId?: string | null;
  technicians: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function request(url: string, body: any) {
    setLoading(true);
    setMessage("");

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

      setMessage("تم الحفظ بنجاح");
      router.refresh();
    } catch (e: any) {
      setMessage(e.message || "تعذر تنفيذ العملية");
    } finally {
      setLoading(false);
    }
  }

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
              request(`/api/admin/orders/${orderId}`, {
                status: e.target.value,
              })
            }
            style={{
              width: "100%",
              marginTop: 8,
              padding: 12,
              borderRadius: 10,
            }}
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

              request(`/api/admin/orders/${orderId}/assign`, {
                technicianId: e.target.value,
              });
            }}
            style={{
              width: "100%",
              marginTop: 8,
              padding: 12,
              borderRadius: 10,
            }}
          >
            <option value="">غير معين</option>

            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && (
        <p
          style={{
            marginBottom: 0,
            marginTop: 14,
            fontWeight: 700,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
