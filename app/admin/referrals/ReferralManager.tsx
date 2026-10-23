"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReferralCode } from "@/lib/referrals";

const emptyForm = {
  id: "",
  code: "",
  ownerName: "",
  ownerPhone: "",
  benefitLabel: "مكافأة بعد كل استخدام مؤكد",
  discountType: "PERCENT" as "FIXED" | "PERCENT",
  discountValue: 5,
  maxUses: "",
  active: true,
};

export default function ReferralManager({
  initialCodes,
  appUrl,
}: {
  initialCodes: ReferralCode[];
  appUrl: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function edit(item: ReferralCode) {
    setForm({
      id: item.id,
      code: item.code,
      ownerName: item.ownerName,
      ownerPhone: item.ownerPhone || "",
      benefitLabel: item.benefitLabel || "",
      discountType: item.discountType,
      discountValue: item.discountValue,
      maxUses: item.maxUses ? String(item.maxUses) : "",
      active: item.active,
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(next = form) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...next,
          maxUses: next.maxUses ? Number(next.maxUses) : null,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "تعذر حفظ كود الإحالة.");
      }

      setMessage("تم حفظ كود الإحالة.");
      setForm(emptyForm);
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || "تعذر حفظ كود الإحالة.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: ReferralCode) {
    await save({
      id: item.id,
      code: item.code,
      ownerName: item.ownerName,
      ownerPhone: item.ownerPhone || "",
      benefitLabel: item.benefitLabel || "",
      discountType: item.discountType,
      discountValue: item.discountValue,
      maxUses: item.maxUses ? String(item.maxUses) : "",
      active: !item.active,
    });
  }


  async function settleReward(item: ReferralCode) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "settle_reward",
          id: item.id,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تسجيل المكافأة.");
      }

      setMessage(`تم تسجيل مكافأة ${item.code} حتى ${item.uses} استخدام.`);
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || "تعذر تسجيل المكافأة.");
    } finally {
      setBusy(false);
    }
  }

  function shareUrl(item: ReferralCode) {
    return new URL(`/ref/${encodeURIComponent(item.code)}`, appUrl).toString();
  }

  async function copy(item: ReferralCode) {
    await navigator.clipboard.writeText(shareUrl(item));
    setMessage(`تم نسخ رابط ${item.code}.`);
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>
          {form.id ? "تعديل كود إحالة" : "إنشاء كود إحالة"}
        </h2>

        <div style={gridStyle}>
          <Field label="الكود">
            <input
              value={form.code}
              disabled={busy}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  code: event.target.value.toUpperCase().replace(/\s+/g, ""),
                }))
              }
              style={inputStyle}
              placeholder="VP-AMR"
              dir="ltr"
            />
          </Field>

          <Field label="صاحب الكود">
            <input
              value={form.ownerName}
              disabled={busy}
              onChange={(event) =>
                setForm((value) => ({ ...value, ownerName: event.target.value }))
              }
              style={inputStyle}
            />
          </Field>

          <Field label="موبايل صاحب الكود">
            <input
              value={form.ownerPhone}
              disabled={busy}
              onChange={(event) =>
                setForm((value) => ({ ...value, ownerPhone: event.target.value }))
              }
              style={inputStyle}
              dir="ltr"
            />
          </Field>

          <Field label="نوع خصم العميل">
            <select
              value={form.discountType}
              disabled={busy}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  discountType: event.target.value as "FIXED" | "PERCENT",
                }))
              }
              style={inputStyle}
            >
              <option value="PERCENT">نسبة %</option>
              <option value="FIXED">مبلغ ثابت</option>
            </select>
          </Field>

          <Field label="قيمة الخصم">
            <input
              type="number"
              min="0"
              value={form.discountValue}
              disabled={busy}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  discountValue: Number(event.target.value) || 0,
                }))
              }
              style={inputStyle}
            />
          </Field>

          <Field label="الحد الأقصى للاستخدامات">
            <input
              type="number"
              min="1"
              value={form.maxUses}
              disabled={busy}
              onChange={(event) =>
                setForm((value) => ({ ...value, maxUses: event.target.value }))
              }
              style={inputStyle}
              placeholder="بدون حد"
            />
          </Field>
        </div>

        <Field label="مكافأة صاحب الكود">
          <input
            value={form.benefitLabel}
            disabled={busy}
            onChange={(event) =>
              setForm((value) => ({ ...value, benefitLabel: event.target.value }))
            }
            style={inputStyle}
            placeholder="مثال: 100 جنيه رصيد بعد كل استخدام مؤكد"
          />
        </Field>

        <label style={checkStyle}>
          <input
            type="checkbox"
            checked={form.active}
            disabled={busy}
            onChange={(event) =>
              setForm((value) => ({ ...value, active: event.target.checked }))
            }
          />
          الكود فعال
        </label>

        {message && <div style={messageStyle}>{message}</div>}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            style={primaryButton}
          >
            {busy ? "جاري الحفظ..." : "حفظ"}
          </button>

          {form.id && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setForm(emptyForm)}
              style={secondaryButton}
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>الأكواد الحالية ({initialCodes.length})</h2>

        <div style={{ display: "grid", gap: 10 }}>
          {initialCodes.map((item) => (
            <article key={item.id} style={rowStyle}>
              <div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                  <strong style={{ fontSize: 18, color: "#071a2b" }}>{item.code}</strong>
                  <span style={item.active ? activeBadge : inactiveBadge}>
                    {item.active ? "فعال" : "موقوف"}
                  </span>
                </div>
                <p style={{ color: "#64748b", margin: "5px 0" }}>
                  {item.ownerName}
                  {item.ownerPhone ? ` — ${item.ownerPhone}` : ""}
                </p>
                <small style={{ color: "#64748b", lineHeight: 1.7 }}>
                  خصم العميل: {item.discountValue}
                  {item.discountType === "PERCENT" ? "%" : " ج"} — الاستخدامات: {item.uses}
                  {item.maxUses ? ` / ${item.maxUses}` : ""}
                  {item.benefitLabel ? ` — مكافأة: ${item.benefitLabel}` : ""}
                </small>
                <small style={{ display: "block", color: item.uses > item.rewardedUses ? "#b45309" : "#166534", marginTop: 4, fontWeight: 800 }}>
                  المكافآت المسجلة: {item.rewardedUses} / {item.uses}
                </small>
              </div>

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <button type="button" onClick={() => void copy(item)} style={secondaryButton}>
                  نسخ الرابط
                </button>
                {item.uses > item.rewardedUses && (
                  <button type="button" disabled={busy} onClick={() => void settleReward(item)} style={secondaryButton}>
                    تسجيل صرف المكافأة
                  </button>
                )}
                <button type="button" onClick={() => edit(item)} style={secondaryButton}>
                  تعديل
                </button>
                <button type="button" onClick={() => void toggle(item)} style={secondaryButton}>
                  {item.active ? "إيقاف" : "تفعيل"}
                </button>
              </div>
            </article>
          ))}

          {initialCodes.length === 0 && (
            <p style={{ color: "#64748b" }}>لا توجد أكواد إحالة بعد.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: 10,
};
const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  marginBottom: 10,
  color: "#334155",
  fontWeight: 800,
  fontSize: 13,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 43,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "8px 10px",
  background: "white",
  color: "#0f172a",
  font: "inherit",
};
const checkStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontWeight: 800,
  margin: "8px 0 12px",
};
const messageStyle: React.CSSProperties = {
  padding: 10,
  marginBottom: 10,
  borderRadius: 9,
  background: "#eef8fd",
  color: "#075985",
};
const primaryButton: React.CSSProperties = {
  minHeight: 40,
  border: 0,
  borderRadius: 9,
  background: "#0f2d4a",
  color: "white",
  padding: "0 14px",
  fontWeight: 900,
  cursor: "pointer",
};
const secondaryButton: React.CSSProperties = {
  minHeight: 38,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
  color: "#0f2d4a",
  padding: "0 11px",
  fontWeight: 800,
  cursor: "pointer",
};
const rowStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 13,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const activeBadge: React.CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 900,
};
const inactiveBadge: React.CSSProperties = {
  ...activeBadge,
  background: "#f1f5f9",
  color: "#64748b",
};
