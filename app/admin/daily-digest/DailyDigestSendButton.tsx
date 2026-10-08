"use client";

import { useState } from "react";

export default function DailyDigestSendButton({
  emailMasked,
}: {
  emailMasked: string;
}) {
  const [busy, setBusy] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  async function send() {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/daily-digest/send",
          {
            method: "POST",
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر إرسال الملخص",
        );
      }

      setMessage(
        `تم إرسال الملخص إلى ${data.destinationMasked || emailMasked}.`,
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إرسال الملخص",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          void send()
        }
        disabled={busy}
        style={{
          minHeight: 42,
          border: 0,
          borderRadius: 10,
          background: "#0f2d4a",
          color: "white",
          padding: "0 14px",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {busy
          ? "جاري الإرسال..."
          : "إرسال الملخص إلى إيميلي"}
      </button>

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
    </div>
  );
}
