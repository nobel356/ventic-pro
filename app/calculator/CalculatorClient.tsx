"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trackConversion } from "@/lib/client-conversion";

type Service = {
  code: string;
  nameAr: string;
  pricingType: string;
  priceFrom: number;
  priceTo: number | null;
};

export default function CalculatorClient() {
  const [services, setServices] = useState<Service[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [calculated, setCalculated] = useState(false);

  useEffect(() => {
    trackConversion("calculator_view");

    fetch("/api/public/pricing", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "تعذر تحميل الأسعار.");
        setServices(Array.isArray(data?.services) ? data.services : []);
      })
      .catch((err) => setError(err?.message || "تعذر تحميل الأسعار."))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () =>
      services
        .map((service) => ({ service, qty: Math.max(0, Number(qty[service.code]) || 0) }))
        .filter((item) => item.qty > 0),
    [services, qty],
  );

  const totals = useMemo(() => {
    let low = 0;
    let high = 0;

    for (const item of selected) {
      low += item.service.priceFrom * item.qty;
      high += (item.service.priceTo ?? item.service.priceFrom) * item.qty;
    }

    return { low, high };
  }, [selected]);

  function calculate() {
    setCalculated(true);
    trackConversion("calculator_estimate", {
      items: selected.length,
      low: Math.round(totals.low),
      high: Math.round(totals.high),
    });
  }

  return (
    <main dir="rtl" style={{ minHeight: "70vh", background: "#f4f8fb", padding: "80px 16px 50px" }}>
      <section style={{ maxWidth: 980, margin: "0 auto" }}>
        <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 13 }}>تقدير سريع</span>
        <h1 style={{ color: "#071a2b", fontSize: "clamp(34px,6vw,52px)", margin: "7px 0 10px" }}>
          حاسبة سعر Ventic Pro
        </h1>
        <p style={{ color: "#64748b", lineHeight: 1.85, maxWidth: 760 }}>
          اختار الخدمات والكميات. التقدير يعتمد على الأسعار الحالية المسجلة في النظام، ولا يشمل أي تجهيزات أو خامات إضافية يتم اكتشافها بعد مراجعة صور المكان.
        </p>

        {loading ? (
          <div style={cardStyle}>جاري تحميل الأسعار...</div>
        ) : error ? (
          <div style={{ ...cardStyle, color: "#991b1b" }}>{error}</div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 9, marginTop: 20 }}>
              {services.map((service) => (
                <article key={service.code} style={rowStyle}>
                  <div>
                    <strong style={{ color: "#071a2b" }}>{service.nameAr}</strong>
                    <small style={{ display: "block", color: "#64748b", marginTop: 4 }}>
                      {service.priceTo && service.priceTo !== service.priceFrom
                        ? `${service.priceFrom.toLocaleString("ar-EG")} - ${service.priceTo.toLocaleString("ar-EG")} ج`
                        : `${service.priceFrom.toLocaleString("ar-EG")} ج`}
                      {service.code === "DUCT_METER" ? " / متر" : ""}
                    </small>
                  </div>

                  <label style={{ display: "grid", gap: 4, width: 120 }}>
                    <span style={{ color: "#64748b", fontSize: 11, fontWeight: 800 }}>
                      {service.code === "DUCT_METER" ? "عدد الأمتار" : "الكمية"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step={service.code === "DUCT_METER" ? "0.5" : "1"}
                      value={qty[service.code] ?? 0}
                      onChange={(event) =>
                        setQty((current) => ({
                          ...current,
                          [service.code]: Math.max(0, Number(event.target.value) || 0),
                        }))
                      }
                      style={inputStyle}
                    />
                  </label>
                </article>
              ))}
            </div>

            <button type="button" onClick={calculate} style={primaryButton}>
              احسب التقدير
            </button>

            {calculated && (
              <section style={{ ...cardStyle, marginTop: 16, borderColor: "#93c5fd" }}>
                <span style={{ color: "#64748b" }}>التقدير الحالي</span>
                <strong style={{ display: "block", color: "#0b2f49", fontSize: 30, marginTop: 5 }}>
                  {totals.low === totals.high
                    ? `${totals.low.toLocaleString("ar-EG")} جنيه`
                    : `${totals.low.toLocaleString("ar-EG")} - ${totals.high.toLocaleString("ar-EG")} جنيه`}
                </strong>
                <p style={{ color: "#64748b", lineHeight: 1.8 }}>
                  ده تقدير مبدئي للخدمات المختارة فقط. السعر النهائي يتأكد بعد مراجعة الموقع/الصور وأي خامات أو فتحات أو كهرباء مطلوبة.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link
                    className="button"
                    href="/order?utm_source=Organic&utm_medium=calculator&utm_campaign=price_calculator"
                    data-track="order_intent"
                    data-track-label="calculator"
                  >
                    ابدأ الطلب بهذا التقدير
                  </Link>
                  <Link className="outline" href="/callback?service=تقدير سعر" data-track="callback_intent">
                    خلّينا نكلّمك
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(7,26,43,.05)",
};
const rowStyle: React.CSSProperties = {
  ...cardStyle,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 43,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "8px 10px",
  font: "inherit",
  fontSize: 16,
};
const primaryButton: React.CSSProperties = {
  minHeight: 48,
  border: 0,
  borderRadius: 11,
  background: "#0f2d4a",
  color: "white",
  padding: "0 18px",
  fontWeight: 900,
  cursor: "pointer",
  marginTop: 16,
};
