"use client";

import Link from "next/link";
import { useState } from "react";

const categories = [
  ["punctuality", "الالتزام بالمواعيد"],
  ["professionalism", "احترافية الفني"],
  ["installationQuality", "جودة التركيب"],
  ["cleanliness", "النظافة بعد التركيب"],
  ["communication", "التواصل وخدمة العملاء"],
  ["valueForMoney", "القيمة مقابل السعر"],
] as const;

const googleReviewUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || "";

export default function ReviewForm({ orderId }: { orderId: string }) {
  const [ratings, setRatings] = useState<Record<string, number>>({
    overall: 5,
    punctuality: 5,
    professionalism: 5,
    installationQuality: 5,
    cleanliness: 5,
    communication: 5,
    valueForMoney: 5,
  });
  const [arrivalNote, setArrivalNote] = useState("وصل في الموعد");
  const [comment, setComment] = useState("");
  const [publicConsent, setPublicConsent] = useState(false);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (wouldRecommend === null) {
      setError("اختار هل ترشح Ventic Pro لحد تعرفه أم لا.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          ...ratings,
          arrivalNote,
          comment,
          publicConsent,
          wouldRecommend,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "تعذر حفظ التقييم");

      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "تعذر حفظ التقييم");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <section style={successCardStyle}>
        <div style={successIconStyle}>✓</div>
        <h2 style={{ color: "#0f2d4a", marginBottom: 6 }}>شكرًا لتقييمك</h2>
        <p style={{ color: "#64748b", lineHeight: 1.8 }}>
          تم حفظ تجربتك بنجاح. رأيك بيساعدنا نحسن الخدمة ونراجع أداء التنفيذ.
        </p>

        {googleReviewUrl && ratings.overall >= 4 && wouldRecommend && (
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noreferrer"
            style={googleButtonStyle}
          >
            ⭐ قيّم Ventic Pro على Google
          </a>
        )}

        <Link href="/customer/account" style={accountLinkStyle}>
          الرجوع لحسابي
        </Link>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>التقييم العام</h2>
        <Stars
          value={ratings.overall}
          set={(value) => setRatings({ ...ratings, overall: value })}
        />
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>تفاصيل الخدمة</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {categories.map(([key, label]) => (
            <div key={key} style={rowStyle}>
              <strong>{label}</strong>
              <Stars
                value={ratings[key]}
                set={(value) => setRatings({ ...ratings, [key]: value })}
              />
            </div>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <label style={fieldStyle}>
          <span>الالتزام بالموعد</span>
          <select value={arrivalNote} onChange={(e) => setArrivalNote(e.target.value)} style={inputStyle}>
            <option>وصل في الموعد</option>
            <option>تأخر أقل من 30 دقيقة</option>
            <option>تأخر أكثر من 30 دقيقة</option>
          </select>
        </label>

        <label style={{ ...fieldStyle, marginTop: 12 }}>
          <span>تعليقك</span>
          <textarea
            rows={5}
            maxLength={1200}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="اكتب تجربتك مع Ventic Pro..."
            style={{ ...inputStyle, padding: 10, resize: "vertical" }}
          />
        </label>

        <div style={{ marginTop: 16 }}>
          <strong style={{ display: "block", marginBottom: 8 }}>
            هل ترشح Ventic Pro لحد تعرفه؟ *
          </strong>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setWouldRecommend(true)}
              style={{
                ...choiceButtonStyle,
                ...(wouldRecommend === true ? selectedYesStyle : {}),
              }}
            >
              نعم، أرشحكم
            </button>
            <button
              type="button"
              onClick={() => setWouldRecommend(false)}
              style={{
                ...choiceButtonStyle,
                ...(wouldRecommend === false ? selectedNoStyle : {}),
              }}
            >
              لا حاليًا
            </button>
          </div>
        </div>

        <label style={{ display: "flex", gap: 9, marginTop: 16, alignItems: "flex-start", lineHeight: 1.7 }}>
          <input type="checkbox" checked={publicConsent} onChange={(e) => setPublicConsent(e.target.checked)} />
          <span>
            أوافق على عرض تعليقي بشكل عام على موقع Ventic Pro بعد المراجعة، بدون رقم الهاتف أو العنوان أو رقم الطلب.
          </span>
        </label>

        {error && <div style={errorStyle}>{error}</div>}

        <button type="button" onClick={() => void submit()} disabled={saving} style={buttonStyle}>
          {saving ? "جاري الحفظ..." : "إرسال التقييم"}
        </button>
      </section>
    </div>
  );
}

function Stars({ value, set }: { value: number; set: (value: number) => void }) {
  return (
    <div dir="ltr" style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => set(star)}
          aria-label={`${star} نجوم`}
          style={{
            border: 0,
            background: "transparent",
            cursor: "pointer",
            fontSize: 28,
            padding: 0,
            color: star <= value ? "#f59e0b" : "#cbd5e1",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18 };
const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid #f1f5f9", paddingBottom: 9 };
const fieldStyle: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 800 };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 42, boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 9, background: "white", font: "inherit" };
const buttonStyle: React.CSSProperties = { border: 0, borderRadius: 10, background: "#0f2d4a", color: "white", padding: "12px 18px", fontWeight: 900, cursor: "pointer", marginTop: 14 };
const errorStyle: React.CSSProperties = { marginTop: 12, padding: 10, borderRadius: 9, background: "#fef2f2", color: "#991b1b" };
const choiceButtonStyle: React.CSSProperties = { minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 13px", background: "white", color: "#334155", fontWeight: 900, cursor: "pointer" };
const selectedYesStyle: React.CSSProperties = { borderColor: "#86efac", background: "#dcfce7", color: "#166534" };
const selectedNoStyle: React.CSSProperties = { borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" };
const successCardStyle: React.CSSProperties = { background: "white", border: "1px solid #bbf7d0", borderRadius: 18, padding: 22, textAlign: "center" };
const successIconStyle: React.CSSProperties = { width: 56, height: 56, display: "grid", placeItems: "center", borderRadius: 16, margin: "0 auto 12px", background: "#dcfce7", color: "#166534", fontSize: 26, fontWeight: 900 };
const googleButtonStyle: React.CSSProperties = { display: "flex", justifyContent: "center", alignItems: "center", minHeight: 45, margin: "12px auto 8px", borderRadius: 11, background: "#0a84ff", color: "white", padding: "9px 14px", textDecoration: "none", fontWeight: 900 };
const accountLinkStyle: React.CSSProperties = { display: "inline-block", color: "#075985", fontWeight: 900, marginTop: 8 };
