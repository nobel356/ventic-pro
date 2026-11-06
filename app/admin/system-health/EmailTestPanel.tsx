"use client";

import { useState } from "react";

type EmailQaMode =
  | "RESET_PASSWORD"
  | "BRANDED"
  | "FAILURE_CONTRACT";

export default function EmailTestPanel() {
  const [email, setEmail] =
    useState("");
  const [busyMode, setBusyMode] =
    useState<EmailQaMode | null>(
      null,
    );
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  async function runTest(
    mode: EmailQaMode,
  ) {
    setBusyMode(mode);
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
              mode,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تنفيذ اختبار الإيميل",
        );
      }

      if (
        mode ===
        "FAILURE_CONTRACT"
      ) {
        setMessage(
          "PASS — مسارا Reset Password وBranded Email رفضا الإرسال بدون عنوان بريد بشكل آمن، بدون أي اتصال خارجي.",
        );
      } else {
        const label =
          mode ===
          "RESET_PASSWORD"
            ? "Password Reset"
            : "Order / Invoice / Warranty";

        setMessage(
          `PASS — تم إرسال اختبار ${label} إلى ${data.destinationMasked} عبر ${data.provider}.`,
        );
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تنفيذ اختبار الإيميل",
      );
    } finally {
      setBusyMode(null);
    }
  }

  const busy =
    busyMode !== null;

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
        Resend Email QA
      </h2>
      <p
        style={{
          color: "#64748b",
          lineHeight: 1.7,
        }}
      >
        اختبر نفس مسارات الإيميل المستخدمة فعليًا في Ventic Pro بدون إنشاء طلب أو تغيير بيانات أي عميل.
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
          placeholder="بريد الاختبار"
          style={{
            flex: "1 1 260px",
            minHeight: 44,
            border:
              "1px solid #cbd5e1",
            borderRadius: 10,
            padding: "0 11px",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 10,
        }}
      >
        <button
          type="button"
          disabled={
            busy || !email.trim()
          }
          onClick={() =>
            void runTest(
              "RESET_PASSWORD",
            )
          }
          style={buttonStyle}
        >
          {busyMode ===
          "RESET_PASSWORD"
            ? "جاري الاختبار..."
            : "اختبار Password Reset"}
        </button>

        <button
          type="button"
          disabled={
            busy || !email.trim()
          }
          onClick={() =>
            void runTest(
              "BRANDED",
            )
          }
          style={buttonStyle}
        >
          {busyMode === "BRANDED"
            ? "جاري الاختبار..."
            : "اختبار Order / Invoice / Warranty"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void runTest(
              "FAILURE_CONTRACT",
            )
          }
          style={{
            ...buttonStyle,
            background:
              "#475569",
          }}
        >
          {busyMode ===
          "FAILURE_CONTRACT"
            ? "جاري الاختبار..."
            : "اختبار Failure Contract"}
        </button>
      </div>

      <p
        style={{
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.7,
          marginBottom: 0,
        }}
      >
        Failure Contract لا يرسل أي رسالة خارجية؛ يختبر أن دوال الإيميل تتعامل مع غياب البريد كفشل متوقع وآمن بدل رمي Exception.
      </p>

      {message && (
        <p
          style={{
            color: "#166534",
            fontWeight: 800,
            lineHeight: 1.7,
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
            lineHeight: 1.7,
          }}
        >
          FAIL — {error}
        </p>
      )}
    </section>
  );
}

const buttonStyle: React.CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 10,
  background: "#0f2d4a",
  color: "white",
  padding: "0 15px",
  fontWeight: 900,
  cursor: "pointer",
};
