"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

type CouponItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  type: "FIXED" | "PERCENT";
  value: number;
  minOrder: number | null;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  usedCount: number;
  eligibleServiceCodes: string[];
  active: boolean;
};

type ServiceItem = {
  code: string;
  nameAr: string;
};

export default function PromotionsManagement() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    type: "FIXED" as "FIXED" | "PERCENT",
    value: "",
    minOrder: "",
    startsAt: "",
    endsAt: "",
    maxUses: "",
    eligibleServiceCodes: [] as string[],
    active: true,
  });

  async function load() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/promotions", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحميل العروض");
      }

      setCoupons(data?.coupons || []);
      setServices(data?.services || []);
      setError("");
    } catch (err: any) {
      setError(err?.message || "تعذر تحميل العروض");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function reset() {
    setEditingId("");
    setForm({
      code: "",
      name: "",
      description: "",
      type: "FIXED",
      value: "",
      minOrder: "",
      startsAt: "",
      endsAt: "",
      maxUses: "",
      eligibleServiceCodes: [],
      active: true,
    });
  }

  function startEdit(item: CouponItem) {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description,
      type: item.type,
      value: String(item.value),
      minOrder: item.minOrder == null ? "" : String(item.minOrder),
      startsAt: item.startsAt ? item.startsAt.slice(0, 10) : "",
      endsAt: item.endsAt ? item.endsAt.slice(0, 10) : "",
      maxUses: item.maxUses == null ? "" : String(item.maxUses),
      eligibleServiceCodes: item.eligibleServiceCodes,
      active: item.active,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleService(code: string) {
    setForm((current) => ({
      ...current,
      eligibleServiceCodes: current.eligibleServiceCodes.includes(code)
        ? current.eligibleServiceCodes.filter((value) => value !== code)
        : [...current.eligibleServiceCodes, code],
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          ...form,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر حفظ العرض");
      }

      setMessage(editingId ? "تم تحديث العرض." : "تم إنشاء العرض.");
      reset();
      await load();
    } catch (err: any) {
      setError(err?.message || "تعذر حفظ العرض");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle}>
        <div style={headStyle}>
          <div>
            <h2 style={{ margin: 0 }}>
              {editingId ? "تعديل العرض" : "إنشاء عرض / كوبون"}
            </h2>
            <p style={mutedStyle}>
              الخصم له مدة وحد أدنى وحد استخدام ويمكن تقييده بخدمات محددة.
            </p>
          </div>

          {editingId && (
            <button type="button" onClick={reset} style={secondaryButtonStyle}>
              إلغاء التعديل
            </button>
          )}
        </div>

        <form onSubmit={save}>
          <div style={gridStyle}>
            <Input
              label="الكود"
              value={form.code}
              onChange={(value) =>
                setForm({
                  ...form,
                  code: value.toUpperCase().replace(/\s/g, ""),
                })
              }
              required
            />
            <Input
              label="اسم العرض"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
            />
            <label style={fieldStyle}>
              <span>نوع الخصم</span>
              <select
                style={inputStyle}
                value={form.type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    type: event.target.value as "FIXED" | "PERCENT",
                  })
                }
              >
                <option value="FIXED">مبلغ ثابت</option>
                <option value="PERCENT">نسبة مئوية</option>
              </select>
            </label>
            <Input
              label={form.type === "PERCENT" ? "النسبة %" : "قيمة الخصم"}
              type="number"
              value={form.value}
              onChange={(value) => setForm({ ...form, value })}
              required
            />
            <Input
              label="الحد الأدنى للطلب"
              type="number"
              value={form.minOrder}
              onChange={(value) => setForm({ ...form, minOrder: value })}
            />
            <Input
              label="أقصى عدد استخدامات"
              type="number"
              value={form.maxUses}
              onChange={(value) => setForm({ ...form, maxUses: value })}
            />
            <Input
              label="بداية العرض"
              type="date"
              value={form.startsAt}
              onChange={(value) => setForm({ ...form, startsAt: value })}
            />
            <Input
              label="نهاية العرض"
              type="date"
              value={form.endsAt}
              onChange={(value) => setForm({ ...form, endsAt: value })}
            />

            <label style={fieldStyle}>
              <span>الحالة</span>
              <span style={toggleStyle}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      active: event.target.checked,
                    })
                  }
                />
                {form.active ? "فعال" : "موقوف"}
              </span>
            </label>
          </div>

          <label style={{ ...fieldStyle, marginTop: 12 }}>
            <span>وصف العرض</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description: event.target.value,
                })
              }
              style={{ ...inputStyle, padding: 10, resize: "vertical" }}
            />
          </label>

          <div style={{ marginTop: 14 }}>
            <strong>الخدمات المؤهلة</strong>
            <p style={mutedStyle}>
              اتركها كلها بدون تحديد ليعمل الكوبون على أي خدمة.
            </p>
            <div style={serviceGridStyle}>
              {services.map((service) => (
                <label key={service.code} style={serviceChoiceStyle}>
                  <input
                    type="checkbox"
                    checked={form.eligibleServiceCodes.includes(service.code)}
                    onChange={() => toggleService(service.code)}
                  />
                  <span>
                    <b>{service.nameAr}</b>
                    <small style={{ display: "block", color: "#64748b" }}>
                      {service.code}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{ ...primaryButtonStyle, marginTop: 14 }}
          >
            {saving ? "جاري الحفظ..." : "حفظ العرض"}
          </button>
        </form>
      </section>

      {message && <div style={successStyle}>{message}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>العروض الحالية</h2>

        {loading ? (
          <p>جاري التحميل...</p>
        ) : coupons.length === 0 ? (
          <p>لا توجد عروض مسجلة.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1050 }}>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>العرض</th>
                  <th>الخصم</th>
                  <th>الحد الأدنى</th>
                  <th>الاستخدام</th>
                  <th>الصلاحية</th>
                  <th>الخدمات</th>
                  <th>الحالة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td><strong>{coupon.code}</strong></td>
                    <td>{coupon.name || coupon.description || "-"}</td>
                    <td>
                      {coupon.type === "PERCENT"
                        ? `${coupon.value}%`
                        : `${coupon.value.toLocaleString("ar-EG")} ج`}
                    </td>
                    <td>
                      {coupon.minOrder == null
                        ? "-"
                        : `${coupon.minOrder.toLocaleString("ar-EG")} ج`}
                    </td>
                    <td>
                      {coupon.usedCount}
                      {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ""}
                    </td>
                    <td>
                      {coupon.startsAt ? new Date(coupon.startsAt).toLocaleDateString("ar-EG") : "الآن"}
                      {" → "}
                      {coupon.endsAt ? new Date(coupon.endsAt).toLocaleDateString("ar-EG") : "مفتوح"}
                    </td>
                    <td>
                      {coupon.eligibleServiceCodes.length
                        ? coupon.eligibleServiceCodes.join("، ")
                        : "كل الخدمات"}
                    </td>
                    <td>{coupon.active ? "فعال" : "موقوف"}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => startEdit(coupon)}
                        style={secondaryButtonStyle}
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input
        style={inputStyle}
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

const cardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,.05)",
};

const headStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
  gap: 10,
  marginTop: 16,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#334155",
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  minHeight: 42,
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
  padding: "0 10px",
  font: "inherit",
};

const toggleStyle: CSSProperties = {
  ...inputStyle,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const serviceGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: 8,
  marginTop: 8,
};

const serviceChoiceStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 40,
  border: 0,
  borderRadius: 9,
  background: "#0f2d4a",
  color: "white",
  padding: "0 13px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 38,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
  color: "#0f2d4a",
  padding: "0 11px",
  fontWeight: 800,
  cursor: "pointer",
};

const mutedStyle: CSSProperties = {
  color: "#64748b",
  marginBottom: 0,
  lineHeight: 1.6,
};

const successStyle: CSSProperties = {
  padding: 11,
  borderRadius: 10,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
};

const errorStyle: CSSProperties = {
  padding: 11,
  borderRadius: 10,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};
