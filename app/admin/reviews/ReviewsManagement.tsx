"use client";

import { useState, type CSSProperties } from "react";

type ReviewItem = {
  id: string;
  orderNo: string;
  customerName: string;
  overall: number;
  comment: string | null;
  publicConsent: boolean;
  isPublished: boolean;
  createdAt: string;
  punctuality: number;
  professionalism: number;
  installationQuality: number;
  cleanliness: number;
  communication: number;
  valueForMoney: number;
};

export default function ReviewsManagement({
  initialReviews,
}: {
  initialReviews: ReviewItem[];
}) {
  const [items, setItems] = useState(initialReviews);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function toggle(item: ReviewItem) {
    setBusyId(item.id);
    setError("");

    try {
      const response = await fetch(`/api/admin/reviews/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: !item.isPublished }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحديث التقييم");
      }

      setItems((current) =>
        current.map((review) =>
          review.id === item.id
            ? { ...review, isPublished: !review.isPublished }
            : review,
        ),
      );
    } catch (err: any) {
      setError(err?.message || "تعذر تحديث التقييم");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {error && <div style={errorStyle}>{error}</div>}

      {items.length === 0 ? (
        <div style={cardStyle}>لا توجد تقييمات حتى الآن.</div>
      ) : (
        items.map((item) => (
          <article key={item.id} style={cardStyle}>
            <div style={headStyle}>
              <div>
                <strong style={{ color: "#0f2d4a" }}>
                  {item.orderNo} — {item.customerName}
                </strong>
                <div style={{ color: "#f59e0b", fontSize: 22, marginTop: 4 }}>
                  {"★".repeat(item.overall)}
                  <span style={{ color: "#cbd5e1" }}>
                    {"★".repeat(5 - item.overall)}
                  </span>
                </div>
              </div>

              <span style={{
                borderRadius: 999,
                padding: "6px 10px",
                fontWeight: 900,
                fontSize: 12,
                background: item.isPublished ? "#dcfce7" : "#f1f5f9",
                color: item.isPublished ? "#166534" : "#475569",
              }}>
                {item.isPublished ? "منشور" : "غير منشور"}
              </span>
            </div>

            <p style={{ lineHeight: 1.8 }}>
              {item.comment || "العميل لم يكتب تعليقًا نصيًا."}
            </p>

            <div style={gridStyle}>
              <Metric label="المواعيد" value={item.punctuality} />
              <Metric label="الاحترافية" value={item.professionalism} />
              <Metric label="التركيب" value={item.installationQuality} />
              <Metric label="النظافة" value={item.cleanliness} />
              <Metric label="التواصل" value={item.communication} />
              <Metric label="القيمة" value={item.valueForMoney} />
            </div>

            <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
              موافقة العميل على النشر: {item.publicConsent ? "نعم" : "لا"} —{" "}
              {new Date(item.createdAt).toLocaleDateString("ar-EG")}
            </div>

            <button
              type="button"
              onClick={() => void toggle(item)}
              disabled={
                busyId === item.id ||
                (!item.isPublished &&
                  (!item.publicConsent || !item.comment || item.overall < 4))
              }
              style={{
                ...buttonStyle,
                background: item.isPublished ? "#fff" : "#0f2d4a",
                color: item.isPublished ? "#b91c1c" : "#fff",
                border: item.isPublished ? "1px solid #fecaca" : "1px solid #0f2d4a",
              }}
            >
              {busyId === item.id
                ? "جاري الحفظ..."
                : item.isPublished
                  ? "إخفاء من الموقع"
                  : "نشر على الموقع"}
            </button>
          </article>
        ))
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, padding: 8 }}>
      <small style={{ color: "#64748b" }}>{label}</small>
      <b style={{ display: "block", color: "#0f2d4a" }}>{value}/5</b>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};
const headStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};
const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
  gap: 8,
};
const buttonStyle: CSSProperties = {
  marginTop: 14,
  borderRadius: 9,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};
const errorStyle: CSSProperties = {
  padding: 11,
  borderRadius: 10,
  background: "#fef2f2",
  color: "#991b1b",
};
