"use client";

import { useState } from "react";

export default function EmailTestPanel() {
  const [email, setEmail] =
    useState("");
  const [busy, setBusy] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  async function sendTest() {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/system-health/email-test",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر إرسال رسالة الاختبار",
        );
      }

      setMessage(
        `تم إرسال الاختبار إلى ${data.destinationMasked}.`,
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إرسال رسالة الاختبار",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      style={{
        marginTop: 20,
        background: "white",
        border:
          "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <h2
        style={{
          marginTop: 0,
        }}
      >
        اختبار Resend
      </h2>
      <p
        style={{
          color: "#64748b",
        }}
      >
        أرسل رسالة اختبار بدون الحاجة للدخول إلى Vercel أو تعديل أي بيانات.
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value,
            )
          }
          placeholder="البريد المراد الاختبار عليه"
          style={{
            flex: "1 1 260px",
            minHeight: 44,
            border:
              "1px solid #cbd5e1",
            borderRadius: 10,
            padding: "0 11px",
          }}
        />
        <button
          type="button"
          disabled={
            busy || !email.trim()
          }
          onClick={() =>
            void sendTest()
          }
          style={{
            minHeight: 44,
            border: 0,
            borderRadius: 10,
            background: "#0f2d4a",
            color: "white",
            padding: "0 15px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {busy
            ? "جاري الإرسال..."
            : "إرسال اختبار"}
        </button>
      </div>

      {message && (
        <p
          style={{
            color: "#166534",
            fontWeight: 800,
          }}
        >
          {message}
        </p>
      )}
      {error && (
        <p
          style={{
            color: "#b91c1c",
            fontWeight: 800,
          }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
