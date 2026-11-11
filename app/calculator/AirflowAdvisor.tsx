"use client";

import { useMemo, useState } from "react";
import {
  ventilationAdvisor,
  type VentilationRouteClass,
} from "@/lib/ventilation-advisor";
import { trackConversion } from "@/lib/client-conversion";

const routeTone: Record<
  VentilationRouteClass,
  {
    background: string;
    border: string;
    color: string;
  }
> = {
  LOW_RESISTANCE: {
    background: "#f0fdf4",
    border: "#bbf7d0",
    color: "#166534",
  },
  MEDIUM_RESISTANCE: {
    background: "#fffbeb",
    border: "#fde68a",
    color: "#92400e",
  },
  HIGH_RESISTANCE: {
    background: "#fff7ed",
    border: "#fed7aa",
    color: "#9a3412",
  },
};

export default function AirflowAdvisor() {
  const [ductLengthM, setDuctLengthM] =
    useState(0);
  const [elbows90, setElbows90] =
    useState(0);
  const [areaM2, setAreaM2] =
    useState<number | "">("");
  const [
    ceilingHeightM,
    setCeilingHeightM,
  ] = useState<number | "">("");
  const [targetAch, setTargetAch] =
    useState<number | "">("");
  const [calculated, setCalculated] =
    useState(false);

  const result = useMemo(
    () =>
      ventilationAdvisor({
        ductLengthM,
        elbows90,
        areaM2:
          areaM2 === ""
            ? undefined
            : areaM2,
        ceilingHeightM:
          ceilingHeightM === ""
            ? undefined
            : ceilingHeightM,
        targetAch:
          targetAch === ""
            ? undefined
            : targetAch,
      }),
    [
      ductLengthM,
      elbows90,
      areaM2,
      ceilingHeightM,
      targetAch,
    ],
  );

  const tone =
    routeTone[result.routeClass];

  function calculate() {
    setCalculated(true);
    trackConversion(
      "calculator_estimate",
      {
        advisor: true,
        routeClass:
          result.routeClass,
        ductLengthM,
        elbows90,
        airflow:
          result.designAirflowM3h,
      },
    );
  }

  return (
    <section
      dir="rtl"
      aria-labelledby="vp-airflow-advisor-title"
      style={{
        maxWidth: 1040,
        margin: "26px auto 0",
        padding: "0 18px",
      }}
    >
      <div
        style={{
          background: "white",
          border:
            "1px solid #dbe7ef",
          borderRadius: 18,
          padding: 20,
        }}
      >
        <span
          style={{
            color: "#0284c7",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          Technical pre-check
        </span>

        <h2
          id="vp-airflow-advisor-title"
          style={{
            color: "#0b2f49",
            margin:
              "6px 0 8px",
          }}
        >
          مساعد اختيار نوع المروحة حسب
          مسار الدكت
        </h2>

        <p
          style={{
            color: "#64748b",
            lineHeight: 1.9,
            marginTop: 0,
          }}
        >
          الأداة لا تختار موديلًا بعينه؛
          لكنها تمنع خطأ شائع: اختيار
          المروحة من رقم الهواء الحر فقط
          بدون النظر لطول الدكت والأكواع
          والضغط الساكن.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(190px,1fr))",
            gap: 10,
          }}
        >
          <NumberField
            label="طول الدكت التقريبي (متر)"
            value={ductLengthM}
            min={0}
            step={0.5}
            onChange={(value) => {
              setCalculated(false);
              setDuctLengthM(value);
            }}
          />

          <NumberField
            label="عدد أكواع 90°"
            value={elbows90}
            min={0}
            step={1}
            onChange={(value) => {
              setCalculated(false);
              setElbows90(
                Math.max(
                  0,
                  Math.floor(value),
                ),
              );
            }}
          />

          <OptionalField
            label="مساحة المكان م² (اختياري)"
            value={areaM2}
            onChange={(value) => {
              setCalculated(false);
              setAreaM2(value);
            }}
          />

          <OptionalField
            label="ارتفاع السقف م (اختياري)"
            value={ceilingHeightM}
            onChange={(value) => {
              setCalculated(false);
              setCeilingHeightM(value);
            }}
          />

          <OptionalField
            label="ACH التصميمي (لو محدد من مهندس/كود)"
            value={targetAch}
            onChange={(value) => {
              setCalculated(false);
              setTargetAch(value);
            }}
          />
        </div>

        <button
          type="button"
          onClick={calculate}
          style={{
            marginTop: 14,
            border: 0,
            borderRadius: 10,
            minHeight: 46,
            padding:
              "0 16px",
            background: "#0f2d4a",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          حلّل المسار
        </button>

        {calculated && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: 16,
              border: `1px solid ${tone.border}`,
              background:
                tone.background,
              color: tone.color,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: 18,
              }}
            >
              {result.routeLabel}
            </strong>

            <p
              style={{
                lineHeight: 1.8,
                marginBottom: 8,
              }}
            >
              {result.recommendation}
            </p>

            {result.roomVolumeM3 !==
              null && (
              <p
                style={{
                  margin:
                    "6px 0",
                }}
              >
                حجم المكان التقريبي:{" "}
                <b>
                  {
                    result.roomVolumeM3
                  }{" "}
                  م³
                </b>
              </p>
            )}

            {result.designAirflowM3h !==
              null && (
              <p
                style={{
                  margin:
                    "6px 0",
                }}
              >
                عند ACH المدخل، تدفق
                التصميم النظري:{" "}
                <b>
                  {
                    result.designAirflowM3h
                  }{" "}
                  م³/ساعة
                </b>
              </p>
            )}

            <small
              style={{
                display: "block",
                lineHeight: 1.7,
                color: "#64748b",
              }}
            >
              {result.caution}
            </small>
          </div>
        )}
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 5,
        color: "#334155",
        fontWeight: 800,
      }}
    >
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(
            Math.max(
              min,
              Number(
                event.target.value,
              ) || 0,
            ),
          )
        }
        style={inputStyle}
      />
    </label>
  );
}

function OptionalField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | "";
  onChange: (
    value: number | "",
  ) => void;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 5,
        color: "#334155",
        fontWeight: 800,
      }}
    >
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={value}
        onChange={(event) => {
          const raw =
            event.target.value;

          onChange(
            raw === ""
              ? ""
              : Math.max(
                  0,
                  Number(raw) || 0,
                ),
          );
        }}
        style={inputStyle}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  minHeight: 44,
  border:
    "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "8px 10px",
  font: "inherit",
  fontSize: 16,
  background: "white",
};
