"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
  active: boolean;
};
type Item = {
  id: string;
  sku: string;
  nameAr: string;
  unit: string;
  quantity: number;
  lastUnitCost: number;
  averageUnitCost: number;
};
type Receipt = {
  id: string;
  receiptNo: string;
  supplierInvoiceNo?: string | null;
  total: number;
  receivedAt: string;
  supplier: { id: string; name: string };
  receivedBy?: { id: string; name: string } | null;
  items: Array<{
    id: string;
    item: { id: string; sku: string; nameAr: string; unit: string };
    quantity: number;
    unitCost: number;
    lineTotal: number;
  }>;
};

type Data = {
  suppliers: Supplier[];
  items: Item[];
  receipts: Receipt[];
  permissions: {
    canManageSuppliers: boolean;
    canReceive: boolean;
    canViewCost: boolean;
  };
};

export default function PurchasesManagement() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingSupplierId, setEditingSupplierId] = useState("");
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    address: "",
    taxNumber: "",
    notes: "",
    active: true,
  });
  const [purchase, setPurchase] = useState({ supplierId: "", supplierInvoiceNo: "", notes: "" });
  const [lines, setLines] = useState([{ itemId: "", quantity: 1, unitCost: 0 }]);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/purchases", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "تعذر تحميل المشتريات");
      setData(json);
      setError("");
    } catch (err: any) {
      setError(err?.message || "تعذر تحميل المشتريات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0),
        0,
      ),
    [lines],
  );

  async function saveSupplier() {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/admin/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingSupplierId ? "supplier-update" : "supplier",
          supplierId: editingSupplierId || undefined,
          ...supplierForm,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "تعذر حفظ المورد");
      setSupplierForm({
        name: "",
        phone: "",
        address: "",
        taxNumber: "",
        notes: "",
        active: true,
      });
      setEditingSupplierId("");
      setMessage(editingSupplierId ? "تم تحديث المورد مع حفظ التعديل في سجل المراجعة." : "تم إضافة المورد.");
      await load();
    } catch (err: any) {
      setError(err?.message || "تعذر حفظ المورد");
    } finally {
      setSaving(false);
    }
  }

  function editSupplier(supplier: Supplier) {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name,
      phone: supplier.phone || "",
      address: supplier.address || "",
      taxNumber: supplier.taxNumber || "",
      notes: supplier.notes || "",
      active: supplier.active,
    });
    setMessage("");
    setError("");
  }

  function cancelSupplierEdit() {
    setEditingSupplierId("");
    setSupplierForm({
      name: "",
      phone: "",
      address: "",
      taxNumber: "",
      notes: "",
      active: true,
    });
  }

  async function receive() {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/admin/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive", ...purchase, items: lines }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "تعذر تسجيل التوريد");
      setMessage(`تم تسجيل التوريد ${json.receiptNo} وإضافة الخامات للمخزون تلقائيًا.`);
      setPurchase({ supplierId: purchase.supplierId, supplierInvoiceNo: "", notes: "" });
      setLines([{ itemId: "", quantity: 1, unitCost: 0 }]);
      await load();
    } catch (err: any) {
      setError(err?.message || "تعذر تسجيل التوريد");
    } finally {
      setSaving(false);
    }
  }

  function updateLine(index: number, key: "itemId" | "quantity" | "unitCost", value: string) {
    setLines((current) =>
      current.map((line, i) =>
        i === index
          ? {
              ...line,
              [key]: key === "itemId" ? value : Number(value),
            }
          : line,
      ),
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={successStyle}>{message}</div>}

      {data?.permissions.canManageSuppliers && (
        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>{editingSupplierId ? "تعديل المورد" : "إضافة مورد"}</h2>
              <p style={mutedStyle}>لا يتم حذف الموردين السابقين؛ يمكن إيقاف المورد مع بقاء تاريخ التوريدات محفوظًا.</p>
            </div>
            {editingSupplierId && <button type="button" style={secondaryButton} onClick={cancelSupplierEdit}>إلغاء التعديل</button>}
          </div>
          <div style={gridStyle}>
            <input style={inputStyle} placeholder="اسم المورد" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
            <input style={inputStyle} placeholder="رقم الهاتف" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
            <input style={inputStyle} placeholder="العنوان" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
            <input style={inputStyle} placeholder="الرقم الضريبي (اختياري)" value={supplierForm.taxNumber} onChange={(e) => setSupplierForm({ ...supplierForm, taxNumber: e.target.value })} />
            <input style={inputStyle} placeholder="ملاحظات المورد" value={supplierForm.notes} onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })} />
            {editingSupplierId && (
              <label style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={supplierForm.active} onChange={(e) => setSupplierForm({ ...supplierForm, active: e.target.checked })} />
                {supplierForm.active ? "نشط" : "موقوف"}
              </label>
            )}
            <button className="button" disabled={saving} onClick={() => void saveSupplier()}>
              {editingSupplierId ? "حفظ المورد" : "إضافة المورد"}
            </button>
          </div>

          {!!data.suppliers.length && (
            <div style={{ overflowX: "auto", marginTop: 16 }}>
              <table style={{ width: "100%", minWidth: 720 }}>
                <thead><tr><th>المورد</th><th>الهاتف</th><th>العنوان</th><th>الحالة</th><th /></tr></thead>
                <tbody>
                  {data.suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td><strong>{supplier.name}</strong></td>
                      <td>{supplier.phone || "-"}</td>
                      <td>{supplier.address || "-"}</td>
                      <td>{supplier.active ? "نشط" : "موقوف"}</td>
                      <td><button type="button" style={secondaryButton} onClick={() => editSupplier(supplier)}>تعديل</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {data?.permissions.canReceive && (
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>تسجيل توريد واستلام للمخزن</h2>
          <p style={mutedStyle}>لا تحتاج بعدها لعمل حركة وارد يدويًا؛ النظام ينشئها ويحدث التكلفة تلقائيًا.</p>

          <div style={gridStyle}>
            <select style={inputStyle} value={purchase.supplierId} onChange={(e) => setPurchase({ ...purchase, supplierId: e.target.value })}>
              <option value="">اختر المورد</option>
              {(data.suppliers || []).filter((s) => s.active).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
            <input style={inputStyle} placeholder="رقم فاتورة المورد (اختياري)" value={purchase.supplierInvoiceNo} onChange={(e) => setPurchase({ ...purchase, supplierInvoiceNo: e.target.value })} />
            <input style={inputStyle} placeholder="ملاحظات" value={purchase.notes} onChange={(e) => setPurchase({ ...purchase, notes: e.target.value })} />
          </div>

          <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
            {lines.map((line, index) => (
              <div key={index} style={lineStyle}>
                <select style={inputStyle} value={line.itemId} onChange={(e) => updateLine(index, "itemId", e.target.value)}>
                  <option value="">اختر الصنف</option>
                  {(data.items || []).map((item) => (
                    <option key={item.id} value={item.id}>{item.sku} — {item.nameAr}</option>
                  ))}
                </select>
                <input style={inputStyle} type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} placeholder="الكمية" />
                <input style={inputStyle} type="number" min="0" step="0.01" value={line.unitCost} onChange={(e) => updateLine(index, "unitCost", e.target.value)} placeholder="تكلفة الوحدة" />
                <button type="button" style={secondaryButton} onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, i) => i !== index))}>حذف السطر</button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
            <button type="button" style={secondaryButton} onClick={() => setLines((current) => [...current, { itemId: "", quantity: 1, unitCost: 0 }])}>+ إضافة بند</button>
            <strong>إجمالي التوريد: {total.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج</strong>
            <button className="button" disabled={saving} onClick={() => void receive()}>{saving ? "جاري التسجيل..." : "استلام وإضافة للمخزون"}</button>
          </div>
        </section>
      )}

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>آخر التوريدات</h2>
        {loading ? <p>جاري التحميل...</p> : !data?.receipts.length ? <p>لا توجد توريدات بعد.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 900 }}>
              <thead><tr><th>رقم التوريد</th><th>المورد</th><th>فاتورة المورد</th><th>التاريخ</th><th>البنود</th><th>الإجمالي</th><th>المستلم</th></tr></thead>
              <tbody>
                {data.receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td><strong>{receipt.receiptNo}</strong></td>
                    <td>{receipt.supplier.name}</td>
                    <td>{receipt.supplierInvoiceNo || "-"}</td>
                    <td>{new Date(receipt.receivedAt).toLocaleString("ar-EG")}</td>
                    <td>{receipt.items.length}</td>
                    <td>{data.permissions.canViewCost ? `${receipt.total.toLocaleString("ar-EG")} ج` : "مخفي"}</td>
                    <td>{receipt.receivedBy?.name || "-"}</td>
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
const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, alignItems: "center" };
const lineStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(230px,2fr) 1fr 1fr auto", gap: 8, alignItems: "center" };
const inputStyle: CSSProperties = { minHeight: 43, width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 10, background: "white", padding: "0 10px", font: "inherit" };
const secondaryButton: CSSProperties = { minHeight: 40, border: "1px solid #cbd5e1", borderRadius: 10, background: "white", color: "#0f2d4a", padding: "0 12px", fontWeight: 800, cursor: "pointer" };
const mutedStyle: CSSProperties = { color: "#64748b", lineHeight: 1.6 };
const successStyle: CSSProperties = { padding: 11, borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" };
const errorStyle: CSSProperties = { padding: 11, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" };
