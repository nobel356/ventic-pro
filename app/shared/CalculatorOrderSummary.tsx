"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const KEY =
  "ventic_calculator_preset";

type Preset = {
  version: number;
  savedAt: number;
  low: number;
  high: number;
  items: Array<{
    code: string;
    nameAr: string;
    qty: number;
  }>;
};

function validPreset(
  value: unknown,
): value is Preset {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const item =
    value as Partial<Preset>;

  return (
    item.version === 1 &&
    typeof item.savedAt ===
      "number" &&
    typeof item.low ===
      "number" &&
    typeof item.high ===
      "number" &&
    Array.isArray(item.items)
  );
}

export default function CalculatorOrderSummary() {
  const pathname =
    usePathname();
  const [preset, setPreset] =
    useState<Preset | null>(
      null,
    );

  useEffect(() => {
    if (
      !pathname.startsWith(
        "/order",
      )
    ) {
      setPreset(null);
      return;
    }

    try {
      const raw =
        window.sessionStorage.getItem(
          KEY,
        );

      if (!raw) return;

      const parsed =
        JSON.parse(raw);

      if (
        !validPreset(parsed)
      ) {
        window.sessionStorage.removeItem(
          KEY,
        );
        return;
      }

      // Keep a calculator handoff only for the current shopping session.
      if (
        Date.now() -
          parsed.savedAt >
        6 * 60 * 60 * 1000
      ) {
        window.sessionStorage.removeItem(
          KEY,
        );
        return;
      }

      setPreset(parsed);
    } catch {
      window.sessionStorage.removeItem(
        KEY,
      );
    }
  }, [pathname]);

  if (
    !pathname.startsWith(
      "/order",
    ) ||
    !preset
  ) {
    return null;
  }

  function clear() {
    try {
      window.sessionStorage.removeItem(
        KEY,
      );
    } catch {}

    setPreset(null);
  }

  return (
    <section
      dir="rtl"
      style={{
        maxWidth: 920,
        margin:
          "72px auto 0",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          background:
            "#eef8fd",
          border:
            "1px solid #bae6fd",
          borderRadius: 15,
          padding: 14,
          boxShadow:
            "0 8px 24px rgba(7,26,43,.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            alignItems:
              "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong
              style={{
                color:
                  "#075985",
              }}
            >
              اختياراتك من حاسبة السعر محفوظة
            </strong>

            <p
              style={{
                margin:
                  "5px 0 0",
                color:
                  "#475569",
                lineHeight: 1.7,
                fontSize: 13,
              }}
            >
              استخدمها كمرجع وأكد تفاصيل الأماكن في خطوات الطلب قبل الإرسال.
            </p>
          </div>

          <button
            type="button"
            onClick={clear}
            style={{
              minHeight: 34,
              border:
                "1px solid #cbd5e1",
              borderRadius: 8,
              background:
                "white",
              color:
                "#475569",
              padding:
                "0 9px",
              fontWeight: 800,
              cursor:
                "pointer",
            }}
          >
            مسح المرجع
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: 5,
            marginTop: 11,
          }}
        >
          {preset.items.map(
            (item) => (
              <div
                key={
                  item.code
                }
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  gap: 10,
                  color:
                    "#334155",
                  fontSize: 13,
                }}
              >
                <span>
                  {
                    item.nameAr
                  }
                </span>
                <b>
                  × {item.qty}
                </b>
              </div>
            ),
          )}
        </div>

        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop:
              "1px solid #bfdbfe",
            color:
              "#0b2f49",
            fontWeight: 900,
          }}
        >
          تقدير الحاسبة:{" "}
          {preset.low ===
          preset.high
            ? `${preset.low.toLocaleString(
                "ar-EG",
              )} ج`
            : `${preset.low.toLocaleString(
                "ar-EG",
              )} - ${preset.high.toLocaleString(
                "ar-EG",
              )} ج`}
        </div>
      </div>
    </section>
  );
}
