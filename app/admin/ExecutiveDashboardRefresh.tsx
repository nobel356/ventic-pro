"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

export default function ExecutiveDashboardRefresh({
  generatedAt,
}: {
  generatedAt: string;
}) {
  const router =
    useRouter();
  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            router.refresh();
          }
        },
        60_000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [router]);

  async function refresh() {
    setBusy(true);
    router.refresh();

    window.setTimeout(
      () => setBusy(false),
      900,
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <small
        style={{
          color: "#64748b",
        }}
      >
        آخر تحديث{" "}
        {new Date(
          generatedAt,
        ).toLocaleTimeString(
          "ar-EG",
          {
            timeZone:
              "Africa/Cairo",
            hour: "2-digit",
            minute: "2-digit",
          },
        )}
      </small>

      <button
        type="button"
        onClick={() =>
          void refresh()
        }
        disabled={busy}
        style={{
          minHeight: 38,
          border:
            "1px solid #cbd5e1",
          borderRadius: 10,
          background: "white",
          color: "#0f2d4a",
          padding: "0 12px",
          fontWeight: 900,
          cursor: "pointer",
          opacity:
            busy ? 0.65 : 1,
        }}
      >
        {busy
          ? "جاري التحديث..."
          : "↻ تحديث الآن"}
      </button>
    </div>
  );
}
