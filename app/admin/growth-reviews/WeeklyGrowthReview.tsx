"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string;
  weekStart: string;
  snapshot: any;
  notes: string | null;
  decisions: string | null;
  refreshedAt: string | null;
};

export default function WeeklyGrowthReview() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/admin/growth-reviews", {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error || "تعذر تحميل Reviews.");
      return;
    }

    setReviews(data?.reviews || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function snapshot() {
    const res = await fetch("/api/admin/growth-reviews", {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error || "تعذر إنشاء Snapshot.");
      return;
    }

    setMessage("تم حفظ/تحديث Snapshot الأسبوع الحالي.");
    await load();
  }

  async function save(review: Review, notes: string, decisions: string) {
    const res = await fetch("/api/admin/growth-reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: review.id,
        notes,
        decisions,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error || "تعذر حفظ Review.");
      return;
    }

    setMessage("تم حفظ الملاحظات والقرارات.");
    await load();
  }

  return (
    <div dir="rtl" style={{ display: "grid", gap: 16 }}>
      <div style={head}>
        <div>
          <h1 style={{ margin: "0 0 6px", color: "#071a2b" }}>
            Weekly Growth Review
          </h1>
          <p style={muted}>
            Snapshot ثابت لكل أسبوع عشان تقارن قراراتك بنتائجها بدل ما كل الأرقام تتغير وتنسى كنت شايف إيه.
          </p>
        </div>
        <button type="button" onClick={() => void snapshot()} style={primary}>
          Save / Refresh This Week
        </button>
      </div>

      {message && <div style={info}>{message}</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} onSave={save} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  onSave,
}: {
  review: Review;
  onSave: (review: Review, notes: string, decisions: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(review.notes || "");
  const [decisions, setDecisions] = useState(review.decisions || "");

  const snap = review.snapshot || {};
  const business = snap.snapshot || {};
  const quality = snap.quality || {};

  return (
    <article style={card}>
      <div style={head}>
        <div>
          <strong style={{ color: "#0b2f49", fontSize: 18 }}>
            أسبوع {new Date(review.weekStart).toLocaleDateString("ar-EG")}
          </strong>
          <div style={metrics}>
            <Metric label="Leads" value={business.leads ?? 0} />
            <Metric label="Orders" value={business.orders ?? 0} />
            <Metric label="Revenue" value={business.revenue ?? 0} />
            <Metric label="SEO" value={quality.seoScore ?? 0} />
          </div>
        </div>
      </div>

      <label style={field}>
        <span>ما الذي حدث؟</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={textarea} />
      </label>

      <label style={field}>
        <span>القرارات للأسبوع القادم</span>
        <textarea value={decisions} onChange={(e) => setDecisions(e.target.value)} rows={4} style={textarea} />
      </label>

      <button type="button" onClick={() => void onSave(review, notes, decisions)} style={secondary}>
        حفظ Review
      </button>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <span style={metric}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

const head: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};
const muted: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.7,
};
const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 15,
  padding: 14,
  display: "grid",
  gap: 12,
};
const metrics: React.CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
  marginTop: 8,
};
const metric: React.CSSProperties = {
  minWidth: 80,
  display: "grid",
  gap: 2,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "6px 8px",
};
const field: React.CSSProperties = {
  display: "grid",
  gap: 5,
  color: "#475569",
  fontWeight: 800,
};
const textarea: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: 9,
  font: "inherit",
  resize: "vertical",
};
const primary: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  background: "#0b2f49",
  color: "white",
  minHeight: 40,
  padding: "8px 12px",
  fontWeight: 900,
};
const secondary: React.CSSProperties = {
  ...primary,
  background: "#eef8fd",
  color: "#075985",
  border: "1px solid #bae6fd",
  width: "fit-content",
};
const info: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1e40af",
  border: "1px solid #bfdbfe",
  borderRadius: 10,
  padding: 10,
};
