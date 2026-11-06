"use client";

import Link from "next/link";
import { useState } from "react";

type QaResult = {
  ok: boolean;
  error?: string;
  checks?: {
    concurrentDedupe: boolean;
    readUnread: boolean;
    recipientIsolation: boolean;
    isolationMode: string;
    concurrencyAttempts: number;
    activeRecipients: number;
    createdRows: number;
  };
};

export default function InternalNotificationQaPage() {
  const [busy, setBusy] =
    useState(false);
  const [result, setResult] =
    useState<QaResult | null>(
      null,
    );

  async function runQa() {
    setBusy(true);
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/admin/system-health/internal-notification-test",
          {
            method: "POST",
          },
        );

      const data =
        (await response.json()) as QaResult;

      setResult(data);
    } catch (error: any) {
      setResult({
        ok: false,
        error:
          error?.message ||
          "تعذر تشغيل الاختبار",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="admin"
      dir="rtl"
      style={{
        maxWidth: 850,
        margin: "0 auto",
        padding:
          "28px 16px 70px",
      }}
    >
      <Link
        href="/admin/system-health"
        style={{
          color: "#075985",
          fontWeight: 900,
        }}
      >
        ← صحة النظام
      </Link>

      <section
        style={{
          marginTop: 18,
          background: "white",
          border:
            "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h1
          style={{
            marginTop: 0,
          }}
        >
          Internal Notifications QA
        </h1>

        <p
          style={{
            color: "#64748b",
            lineHeight: 1.8,
          }}
        >
          يرسل نفس إشعار QA ثماني مرات بالتوازي لاختبار منع التكرار، ثم يختبر القراءة وعزل المستلمين. يتم حذف كل إشعارات الاختبار تلقائيًا.
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void runQa()
          }
          style={{
            minHeight: 46,
            border: 0,
            borderRadius: 10,
            background:
              "#0f2d4a",
            color: "white",
            padding:
              "0 18px",
            fontWeight: 900,
            cursor: busy
              ? "wait"
              : "pointer",
          }}
        >
          {busy
            ? "جاري اختبار الضغط..."
            : "تشغيل Internal Notifications QA"}
        </button>

        {result && (
          <div
            style={{
              marginTop: 18,
              border:
                `1px solid ${
                  result.ok
                    ? "#bbf7d0"
                    : "#fecaca"
                }`,
              background:
                result.ok
                  ? "#f0fdf4"
                  : "#fef2f2",
              borderRadius: 12,
              padding: 14,
              color:
                result.ok
                  ? "#166534"
                  : "#991b1b",
              lineHeight: 1.8,
            }}
          >
            <strong>
              {result.ok
                ? "PASS ✓"
                : "FAIL ✗"}
            </strong>

            {result.checks && (
              <div>
                Concurrent Dedupe:{" "}
                {result.checks
                  .concurrentDedupe
                  ? "✓"
                  : "✗"}
                {" / "}
                Read-Unread:{" "}
                {result.checks
                  .readUnread
                  ? "✓"
                  : "✗"}
                {" / "}
                Recipient Isolation:{" "}
                {result.checks
                  .recipientIsolation
                  ? "✓"
                  : "✗"}
                {" / "}
                Attempts:{" "}
                {
                  result.checks
                    .concurrencyAttempts
                }
                {" / "}
                Rows:{" "}
                {
                  result.checks
                    .createdRows
                }
              </div>
            )}

            {result.error && (
              <div>
                {result.error}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
