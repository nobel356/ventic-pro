"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function CallbackPage() {
  const searchParams = useSearchParams();
  const service = String(searchParams.get("service") || "").slice(0, 120);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanName.length < 2) {
      setMessage("اكتب اسمك.");
      return;
    }

    if (!/^01\d{9}$/.test(cleanPhone)) {
      setMessage("اكتب رقم موبايل مصري صحيح مكوّن من 11 رقم.");
      return;
    }

    if (!consent) {
      setMessage("لازم توافق إن فريق Ventic Pro يتواصل معاك.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          currentStep: 1,
          consentToFollowUp: true,
          payload: {
            requestType: "QUICK_REQUEST",
            intent: "CALLBACK",
            preferredContact: "PHONE",
            service: service || null,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "تعذر إرسال طلب الاتصال.");
      }

      setDone(true);
    } catch (error: any) {
      setMessage(error?.message || "تعذر إرسال طلب الاتصال.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "70vh",
        padding: "80px 16px 50px",
        background: "#f4f8fb",
      }}
    >
      <section
        style={{
          width: "min(620px,100%)",
          margin: "0 auto",
          background: "white",
          border: "1px solid #dbe7ef",
          borderRadius: 22,
          padding: 22,
          boxShadow: "0 18px 50px rgba(7,26,43,.10)",
        }}
      >
        {done ? (
          <>
            <div style={successIcon}>✓</div>
            <h1 style={{ color: "#071a2b", marginBottom: 8 }}>وصلنا طلبك</h1>
            <p style={{ color: "#64748b", lineHeight: 1.85 }}>
              تم تسجيل رقمك لفريق Ventic Pro للتواصل معك. لو مستعجل، تقدر تبدأ طلب كامل من الموقع.
            </p>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <Link className="button" href="/order">ابدأ طلب كامل</Link>
              <Link className="outline" href="/">الرئيسية</Link>
            </div>
          </>
        ) : (
          <>
            <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 13 }}>
              مكالمة سريعة
            </span>

            <h1
              style={{
                color: "#071a2b",
                margin: "6px 0 8px",
                fontSize: "clamp(28px,5vw,38px)",
              }}
            >
              سيب رقمك وإحنا نكلّمك
            </h1>

            <p style={{ color: "#64748b", lineHeight: 1.85, marginTop: 0 }}>
              لو مش عاوز تكمل فورم الطلب دلوقتي، سيب اسمك ورقمك فقط وفريق Ventic Pro يتابع معاك.
            </p>

            {service && <div style={serviceBadge}>الخدمة المهتم بها: {service}</div>}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: 10,
              }}
            >
              <label style={fieldStyle}>
                <span>الاسم *</span>
                <input
                  value={name}
                  disabled={busy}
                  autoComplete="name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="اسمك"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                <span>رقم الموبايل *</span>
                <input
                  value={phone}
                  disabled={busy}
                  inputMode="tel"
                  autoComplete="tel"
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="01XXXXXXXXX"
                  dir="ltr"
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={consentStyle}>
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(event) => setConsent(event.target.checked)}
                style={{ marginTop: 3 }}
              />
              أوافق إن فريق Ventic Pro يتواصل معايا على الرقم ده بخصوص استفساري.
            </label>

            {message && <div style={warningStyle}>{message}</div>}

            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              style={{
                width: "100%",
                minHeight: 49,
                border: 0,
                borderRadius: 12,
                background: "linear-gradient(135deg,#0a84ff,#0574d4)",
                color: "white",
                fontWeight: 900,
                fontSize: 15,
                cursor: "pointer",
                marginTop: 16,
                opacity: busy ? 0.65 : 1,
              }}
            >
              {busy ? "جاري الإرسال..." : "اطلب مكالمة"}
            </button>

            <div
              style={{
                marginTop: 12,
                textAlign: "center",
                color: "#64748b",
                fontSize: 12,
              }}
            >
              أو{" "}
              <Link href="/order" style={{ color: "#075985", fontWeight: 900 }}>
                اعمل طلب كامل دلوقتي
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  border: "1px solid #cbd5e1",
  borderRadius: 11,
  padding: "11px 12px",
  background: "white",
  color: "#0f172a",
  font: "inherit",
  fontSize: 16,
};

const consentStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  marginTop: 14,
  color: "#475569",
  lineHeight: 1.6,
  fontSize: 13,
  cursor: "pointer",
};

const warningStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  fontWeight: 800,
  fontSize: 13,
};

const serviceBadge: React.CSSProperties = {
  background: "#eef8fd",
  border: "1px solid #cfe8f5",
  color: "#075985",
  borderRadius: 11,
  padding: "9px 11px",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 14,
};

const successIcon: React.CSSProperties = {
  width: 58,
  height: 58,
  display: "grid",
  placeItems: "center",
  borderRadius: 18,
  background: "#dcfce7",
  color: "#166534",
  fontSize: 27,
  fontWeight: 900,
};
