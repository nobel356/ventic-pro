"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Summary = {
  id: string;
  stocktakeNo: string;
  status: "DRAFT" | "APPROVED";
  locationType: "COMPANY" | "TECHNICIAN";
  technician?: { id: string; name: string } | null;
  createdAt: string;
  approvedAt?: string | null;
  lineCount: number;
};
type Detail = Summary & {
  notes?: string | null;
  lines: Array<{
    id: string;
    itemId: string;
    item: { id: string; sku: string; nameAr: string; unit: string };
    expectedQty: number;
    actualQty: number | null;
    difference: number | null;
    note?: string | null;
  }>;
};
type Technician = { id: string; name: string };

export default function StocktakeManagement() {
  const [stocktakes, setStocktakes] = useState<Summary[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [form, setForm] = useState({ locationType: "COMPANY", technicianId: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadList() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/inventory/stocktakes", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "تعذر تحميل الجرد");
      setStocktakes(data.stocktakes || []);
      setTechnicians(data.technicians || []);
      setError("");
    } catch (err: any) {
      setError(err?.message || "تعذر تحميل الجرد");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadList();
  }, []);

  async function open(id: string) {
    setError("");
    try {
      const response = await fetch(`/api/admin/inventory/stocktakes/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "تعذر فتح الجرد");
      setSelected(data);
    } catch (err: any) {
      setError(err?.message || "تعذر فتح الجرد");
    }
  }

  async function create() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/inventory/stocktakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "تعذر إنشاء الجرد");
      setMessage(`تم إنشاء ${data.stocktakeNo}. أدخل الكميات الفعلية ثم اعتمد.`);
      await loadList();
      await open(data.id);
    } catch (err: any) {
      setError(err?.message || "تعذر إنشاء الجرد");
    } finally {
      setSaving(false);
    }
  }

  function updateLine(id: string, key: "actualQty" | "note", value: string) {
    setSelected((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) =>
              line.id === id
                ? {
                    ...line,
                    [key]: key === "actualQty" ? (value === "" ? null : Number(value)) : value,
                    ...(key === "actualQty"
                      ? {
                          difference:
                            value === "" ? null : Number(value) - line.expectedQty,
                        }
                      : {}),
                  }
                : line,
            ),
          }
        : current,
    );
  }

  async function save(action: "save" | "approve") {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/inventory/stocktakes/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          lines: selected.lines.map((line) => ({
            id: line.id,
            actualQty: line.actualQty,
            note: line.note,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "تعذر حفظ الجرد");
      setSelected(data);
      setMessage(action === "approve" ? "تم اعتماد الجرد وتسجيل فروق التسوية في المخزون." : "تم حفظ العد الفعلي.");
      await loadList();
    } catch (err: any) {
      setError(err?.message || "تعذر حفظ الجرد");
    } finally {
      setSaving(false);
    }
  }

  const diffSummary = useMemo(() => {
    if (!selected) return { counted: 0, differences: 0 };
    return {
      counted: selected.lines.filter((line) => line.actualQty != null).length,
      differences: selected.lines.filter((line) => line.difference != null && Math.abs(line.difference) > 0.000001).length,
    };
  }, [selected]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={successStyle}>{message}</div>}

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>بدء جرد جديد</h2>
        <div style={gridStyle}>
          <select style={inputStyle} value={form.locationType} onChange={(e) => setForm({ ...form, locationType: e.target.value, technicianId: "" })}>
            <option value="COMPANY">مخزن الشركة</option>
            <option value="TECHNICIAN">عهدة فني</option>
          </select>
          {form.locationType === "TECHNICIAN" && (
            <select style={inputStyle} value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}>
              <option value="">اختر الفني</option>
              {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
            </select>
          )}
          <input style={inputStyle} placeholder="ملاحظات الجرد" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="button" disabled={saving} onClick={() => void create()}>إنشاء جلسة الجرد</button>
        </div>
      </section>

      {selected && (
        <section style={{ ...cardStyle, border: "2px solid #bfdbfe" }}>
          <div style={headStyle}>
            <div>
              <h2 style={{ margin: 0 }}>{selected.stocktakeNo}</h2>
              <p style={mutedStyle}>
                {selected.locationType === "COMPANY" ? "مخزن الشركة" : `عهدة ${selected.technician?.name || "الفني"}`} — {selected.status === "DRAFT" ? "مسودة" : "معتمد"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badgeStyle}>تم عد {diffSummary.counted}/{selected.lines.length}</span>
              <span style={{ ...badgeStyle, background: diffSummary.differences ? "#fff7ed" : "#f0fdf4", color: diffSummary.differences ? "#9a3412" : "#166534" }}>
                فروق: {diffSummary.differences}
              </span>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 14 }}>
            <table style={{ width: "100%", minWidth: 850 }}>
              <thead><tr><th>الكود</th><th>الصنف</th><th>الوحدة</th><th>المتوقع</th><th>الفعلي</th><th>الفرق</th><th>ملاحظة</th></tr></thead>
              <tbody>
                {selected.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.item.sku}</td>
                    <td>{line.item.nameAr}</td>
                    <td>{line.item.unit}</td>
                    <td>{line.expectedQty.toLocaleString("ar-EG")}</td>
                    <td>
                      {selected.status === "DRAFT" ? (
                        <input style={{ ...inputStyle, minWidth: 110 }} type="number" min="0" step="0.01" value={line.actualQty ?? ""} onChange={(e) => updateLine(line.id, "actualQty", e.target.value)} />
                      ) : line.actualQty?.toLocaleString("ar-EG")}
                    </td>
                    <td style={{ color: line.difference && line.difference !== 0 ? "#b91c1c" : "#166534", fontWeight: 800 }}>
                      {line.difference == null ? "-" : line.difference.toLocaleString("ar-EG")}
                    </td>
                    <td>
                      {selected.status === "DRAFT" ? (
                        <input style={{ ...inputStyle, minWidth: 180 }} value={line.note || ""} onChange={(e) => updateLine(line.id, "note", e.target.value)} />
                      ) : line.note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected.status === "DRAFT" && (
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 14 }}>
              <button style={secondaryButton} disabled={saving} onClick={() => void save("save")}>حفظ العد</button>
              <button className="button" disabled={saving} onClick={() => window.confirm("اعتماد الجرد سيُنشئ تسويات للفروق ولا يمكن تعديل الجرد بعد الاعتماد. متابعة؟") && void save("approve")}>اعتماد الجرد والتسوية</button>
            </div>
          )}
        </section>
      )}

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>سجل الجرد</h2>
        {loading ? <p>جاري التحميل...</p> : !stocktakes.length ? <p>لا توجد جلسات جرد بعد.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 760 }}>
              <thead><tr><th>رقم الجرد</th><th>الموقع</th><th>التاريخ</th><th>الأصناف</th><th>الحالة</th><th /></tr></thead>
              <tbody>
                {stocktakes.map((stocktake) => (
                  <tr key={stocktake.id}>
                    <td><strong>{stocktake.stocktakeNo}</strong></td>
                    <td>{stocktake.locationType === "COMPANY" ? "مخزن الشركة" : `عهدة ${stocktake.technician?.name || "فني"}`}</td>
                    <td>{new Date(stocktake.createdAt).toLocaleString("ar-EG")}</td>
                    <td>{stocktake.lineCount}</td>
                    <td>{stocktake.status === "APPROVED" ? "معتمد" : "مسودة"}</td>
                    <td><button style={secondaryButton} onClick={() => void open(stocktake.id)}>فتح</button></td>
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

const cardStyle: CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 18, padding: 20, boxShadow: "0 8px 24px rgba(15,23,42,.05)" };
const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, alignItems: "center" };
const headStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" };
const inputStyle: CSSProperties = { minHeight: 42, width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 9, padding: "0 9px", background: "white", font: "inherit" };
const secondaryButton: CSSProperties = { minHeight: 38, border: "1px solid #cbd5e1", borderRadius: 9, background: "white", color: "#0f2d4a", padding: "0 12px", fontWeight: 800, cursor: "pointer" };
const mutedStyle: CSSProperties = { color: "#64748b", marginBottom: 0 };
const badgeStyle: CSSProperties = { borderRadius: 999, background: "#eff6ff", color: "#1e3a8a", padding: "6px 10px", fontSize: 12, fontWeight: 900 };
const successStyle: CSSProperties = { padding: 11, borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" };
const errorStyle: CSSProperties = { padding: 11, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" };
