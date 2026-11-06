"use client";

import Link from "next/link";
import { useState } from "react";

type QaResult = {
  ok: boolean;
  error?: string;
  checks?: {
    concurrentAttempts: number;
    owners: number;
    replay: boolean;
    payloadConflict: boolean;
    durableRows: number;
  };
};

export default function IdempotencyQaPage() {
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
          "/api/admin/system-health/idempotency-test",
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
          background:
            "white",
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
          Failure / Retry / Idempotency QA
        </h1>

        <p
          style={{
            color:
              "#64748b",
            lineHeight: 1.8,
          }}
        >
          الاختبار يحاول حجز نفس طلب الإنشاء 8 مرات بالتوازي. يجب أن يوجد Owner واحد فقط، ثم يعيد Retry نفس النتيجة، بينما يتم رفض نفس المفتاح إذا تغيرت بيانات الطلب. لا يتم إنشاء أي طلب عميل حقيقي.
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
            : "تشغيل Idempotency QA"}
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
                Concurrent Attempts:{" "}
                {
                  result.checks
                    .concurrentAttempts
                }
                {" / "}
                Owners:{" "}
                {
                  result.checks
                    .owners
                }
                {" / "}
                Replay:{" "}
                {result.checks
                  .replay
                  ? "✓"
                  : "✗"}
                {" / "}
                Payload Conflict:{" "}
                {result.checks
                  .payloadConflict
                  ? "✓"
                  : "✗"}
                {" / "}
                Durable Rows:{" "}
                {
                  result.checks
                    .durableRows
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
