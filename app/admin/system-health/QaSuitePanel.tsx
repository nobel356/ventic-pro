"use client";

import { useState } from "react";

type QaName =
  | "notifications"
  | "idempotency"
  | "uploads";

type QaState = {
  status:
    | "idle"
    | "running"
    | "pass"
    | "fail";
  detail?: string;
};

const initialState: Record<
  QaName,
  QaState
> = {
  notifications: {
    status: "idle",
  },
  idempotency: {
    status: "idle",
  },
  uploads: {
    status: "idle",
  },
};

const qaConfig: Record<
  QaName,
  {
    title: string;
    endpoint: string;
  }
> = {
  notifications: {
    title:
      "Internal Notifications",
    endpoint:
      "/api/admin/system-health/internal-notification-test",
  },
  idempotency: {
    title:
      "Failure / Retry / Idempotency",
    endpoint:
      "/api/admin/system-health/idempotency-test",
  },
  uploads: {
    title:
      "Upload Integrity",
    endpoint:
      "/api/admin/system-health/upload-integrity-test",
  },
};

function summarize(
  name: QaName,
  data: any,
) {
  if (name === "notifications") {
    const c =
      data?.checks || {};

    return [
      `Dedupe ${c.concurrentDedupe ? "✓" : "✗"}`,
      `Read/Unread ${c.readUnread ? "✓" : "✗"}`,
      `Isolation ${c.recipientIsolation ? "✓" : "✗"}`,
      `Attempts ${c.concurrencyAttempts ?? "-"}`,
    ].join(" / ");
  }

  if (name === "idempotency") {
    const c =
      data?.checks || {};

    return [
      `Owner ${c.owners === 1 ? "✓" : "✗"}`,
      `Replay ${c.replay ? "✓" : "✗"}`,
      `Conflict ${c.payloadConflict ? "✓" : "✗"}`,
      `Rows ${c.durableRows ?? "-"}`,
    ].join(" / ");
  }

  const c =
    data?.checks || {};

  return [
    `Rollback ${c.transactionRollback ? "✓" : "✗"}`,
    `Orphan cleanup ${c.orphanBlobCleanup ? "✓" : "✗"}`,
    `Retry dedupe ${c.duplicateRetry ? "✓" : "✗"}`,
    `DB row ${c.singleDbRow ? "✓" : "✗"}`,
    `Blob cleanup ${c.duplicateBlobCleanup ? "✓" : "✗"}`,
    `Cleanup ${data?.cleanup ? "✓" : "✗"}`,
  ].join(" / ");
}

export default function QaSuitePanel() {
  const [states, setStates] =
    useState(initialState);
  const [runAllBusy, setRunAllBusy] =
    useState(false);

  function setQa(
    name: QaName,
    state: QaState,
  ) {
    setStates((current) => ({
      ...current,
      [name]: state,
    }));
  }

  async function runOne(
    name: QaName,
  ) {
    setQa(name, {
      status: "running",
    });

    try {
      const response =
        await fetch(
          qaConfig[name].endpoint,
          {
            method: "POST",
          },
        );

      const data =
        await response.json();

      const passed =
        response.ok &&
        data?.ok === true;

      setQa(name, {
        status: passed
          ? "pass"
          : "fail",
        detail: passed
          ? summarize(
              name,
              data,
            )
          : String(
              data?.error ||
                "QA_FAILED",
            ),
      });

      return passed;
    } catch (error: any) {
      setQa(name, {
        status: "fail",
        detail:
          error?.message ||
          "QA_REQUEST_FAILED",
      });

      return false;
    }
  }

  async function runAll() {
    if (runAllBusy) {
      return;
    }

    setRunAllBusy(true);

    try {
      for (const name of [
        "notifications",
        "idempotency",
        "uploads",
      ] as QaName[]) {
        const ok =
          await runOne(name);

        if (!ok) {
          break;
        }
      }
    } finally {
      setRunAllBusy(false);
    }
  }

  const allPassed =
    Object.values(
      states,
    ).every(
      (item) =>
        item.status ===
        "pass",
    );

  return (
    <section
      style={{
        marginTop: 22,
        background: "white",
        border:
          "1px solid #e2e8f0",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin:
                "0 0 6px",
            }}
          >
            V20Y QA Suite
          </h2>
          <p
            style={{
              margin: 0,
              color:
                "#64748b",
              lineHeight: 1.7,
            }}
          >
            الاختبارات الداخلية تنظف بياناتها تلقائيًا. اختبار الإيميل موجود أسفل هذا القسم لأنه يحتاج بريد اختبار.
          </p>
        </div>

        <button
          type="button"
          disabled={runAllBusy}
          onClick={() =>
            void runAll()
          }
          style={{
            minHeight: 42,
            border: 0,
            borderRadius: 10,
            background:
              allPassed
                ? "#166534"
                : "#0f2d4a",
            color: "white",
            padding:
              "0 14px",
            fontWeight: 900,
            cursor:
              runAllBusy
                ? "wait"
                : "pointer",
          }}
        >
          {runAllBusy
            ? "جاري تشغيل QA..."
            : allPassed
              ? "PASS ✓ — إعادة التشغيل"
              : "تشغيل الاختبارات الثلاثة"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(230px,1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {(
          Object.keys(
            qaConfig,
          ) as QaName[]
        ).map((name) => {
          const item =
            states[name];
          const cfg =
            qaConfig[name];

          return (
            <article
              key={name}
              style={{
                border:
                  `1px solid ${
                    item.status ===
                    "pass"
                      ? "#bbf7d0"
                      : item.status ===
                          "fail"
                        ? "#fecaca"
                        : "#e2e8f0"
                  }`,
                borderRadius: 12,
                padding: 13,
                background:
                  item.status ===
                  "pass"
                    ? "#f0fdf4"
                    : item.status ===
                        "fail"
                      ? "#fef2f2"
                      : "#f8fafc",
              }}
            >
              <strong
                style={{
                  color:
                    item.status ===
                    "pass"
                      ? "#166534"
                      : item.status ===
                          "fail"
                        ? "#991b1b"
                        : "#0f2d4a",
                }}
              >
                {item.status ===
                "pass"
                  ? "✓ "
                  : item.status ===
                      "fail"
                    ? "✗ "
                    : ""}
                {cfg.title}
              </strong>

              <div
                style={{
                  minHeight: 42,
                  marginTop: 7,
                  color:
                    "#64748b",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {item.status ===
                "running"
                  ? "جاري الاختبار..."
                  : item.detail ||
                    "لم يتم التشغيل في هذه الجلسة."}
              </div>

              <button
                type="button"
                disabled={
                  item.status ===
                    "running" ||
                  runAllBusy
                }
                onClick={() =>
                  void runOne(
                    name,
                  )
                }
                style={{
                  marginTop: 8,
                  minHeight: 36,
                  border:
                    "1px solid #cbd5e1",
                  borderRadius: 9,
                  background:
                    "white",
                  color:
                    "#0f2d4a",
                  padding:
                    "0 10px",
                  fontWeight: 800,
                  cursor:
                    item.status ===
                      "running" ||
                    runAllBusy
                      ? "wait"
                      : "pointer",
                }}
              >
                تشغيل
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
