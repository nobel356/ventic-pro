"use client";

import Link from "next/link";
import { useState } from "react";

type Result = {
  ok: boolean;
  error?: string;
  checks?: Record<
    string,
    boolean
  >;
  cleanup?: boolean;
};

export default function UploadIntegrityQaPage() {
  const [busy, setBusy] =
    useState(false);
  const [result, setResult] =
    useState<Result | null>(
      null,
    );

  async function runQa() {
    setBusy(true);
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/admin/system-health/upload-integrity-test",
          {
            method: "POST",
          },
        );

      setResult(
        await response.json(),
      );
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
        maxWidth: 900,
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
          Upload Integrity QA
        </h1>

        <p
          style={{
            color:
              "#64748b",
            lineHeight: 1.8,
          }}
        >
          يرفع PNG صغير جدًا إلى Vercel Blob، يجبر فشلًا بعد إنشاء سجل الصورة لاختبار rollback والتنظيف، ثم يعيد نفس upload key للتأكد من منع التكرار. كل ملفات وسجلات الاختبار تُحذف تلقائيًا.
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
            ? "جاري اختبار Blob + DB..."
            : "تشغيل Upload Integrity QA"}
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
              lineHeight: 1.9,
            }}
          >
            <strong>
              {result.ok
                ? "PASS ✓"
                : "FAIL ✗"}
            </strong>

            {result.checks && (
              <div>
                {Object.entries(
                  result.checks,
                )
                  .map(
                    ([key, ok]) =>
                      `${key}: ${
                        ok
                          ? "✓"
                          : "✗"
                      }`,
                  )
                  .join(" / ")}
              </div>
            )}

            {typeof result.cleanup ===
              "boolean" && (
              <div>
                Cleanup:{" "}
                {result.cleanup
                  ? "✓"
                  : "✗"}
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
