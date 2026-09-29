"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Technician = {
  id: string;
  name: string;
  login: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
};

type FormState = {
  name: string;
  login: string;
  phone: string;
  password: string;
  active: boolean;
};

const emptyForm: FormState = {
  name: "",
  login: "",
  phone: "",
  password: "",
  active: true,
};

export default function TechnicianManagement() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/technicians", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "تعذر تحميل الفنيين");
      setTechnicians(data.technicians || []);
      setCanManage(Boolean(data.canManage));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(technician: Technician) {
    setEditingId(technician.id);
    setForm({
      name: technician.name,
      login: technician.login,
      phone: technician.phone || "",
      password: "",
      active: technician.active,
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim() || !form.login.trim()) {
      setError("اكتب اسم الفني واسم الدخول.");
      return;
    }
    if (!editingId && form.password.length < 12) {
      setError("كلمة المرور يجب ألا تقل عن 12 حرفًا.");
      return;
    }
    if (editingId && form.password && form.password.length < 12) {
      setError("كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/admin/technicians/${editingId}` : "/api/admin/technicians",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "تعذر حفظ الفني");

      setMessage(editingId ? "تم تحديث بيانات الفني." : "تم إضافة الفني بنجاح.");
      await load();
      if (!editingId) setForm(emptyForm);
      else setForm((current) => ({ ...current, password: "" }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {canManage && (
        <form onSubmit={save} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>{editingId ? "تعديل الفني" : "إضافة فني جديد"}</h2>
              <p style={{ marginBottom: 0, color: "#64748b" }}>
                تقدر تعدل الاسم، اسم الدخول، الهاتف، حالة الحساب أو تغير كلمة المرور.
              </p>
            </div>
            {editingId && (
              <button type="button" onClick={reset} style={secondaryButtonStyle}>
                إضافة فني جديد
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginTop: 18 }}>
            <label style={fieldStyle}>
              <span>اسم الفني</span>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label style={fieldStyle}>
              <span>اسم الدخول / البريد</span>
              <input style={inputStyle} value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required />
            </label>
            <label style={fieldStyle}>
              <span>رقم الهاتف</span>
              <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" />
            </label>
            <label style={fieldStyle}>
              <span>{editingId ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}</span>
              <input style={inputStyle} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="12 حرفًا على الأقل" autoComplete="new-password" />
            </label>
            <label style={fieldStyle}>
              <span>حالة الحساب</span>
              <span style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 9 }}>
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                {form.active ? "نشط" : "موقوف"}
              </span>
            </label>
          </div>

          {error && <div style={errorStyle}>{error}</div>}
          {message && <div style={successStyle}>{message}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button className="button" type="submit" disabled={saving}>
              {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة الفني"}
            </button>
            {editingId && (
              <button type="button" onClick={reset} style={secondaryButtonStyle}>
                إلغاء
              </button>
            )}
          </div>
        </form>
      )}

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>الفنيون الموجودون</h2>
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              {canManage ? "اضغط تعديل لأي فني لتغيير بياناته أو حالة حسابه." : "عرض قائمة الفنيين المتاحين."}
            </p>
          </div>
          <span style={{ fontWeight: 800, color: "#0f2d4a" }}>{technicians.length} فني</span>
        </div>

        {loading ? (
          <p>جاري تحميل الفنيين...</p>
        ) : technicians.length === 0 ? (
          <p>لا يوجد فنيون حاليًا.</p>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {technicians.map((technician) => (
              <div
                key={technician.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(180px,1.3fr) minmax(150px,1fr) minmax(120px,.7fr) auto",
                  gap: 12,
                  alignItems: "center",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div>
                  <strong style={{ color: "#0f2d4a" }}>{technician.name}</strong>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{technician.login}</div>
                </div>
                <div style={{ color: "#475569" }}>{technician.phone || "بدون رقم هاتف"}</div>
                <span
                  style={{
                    width: "fit-content",
                    padding: "5px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    background: technician.active ? "#dcfce7" : "#fee2e2",
                    color: technician.active ? "#166534" : "#991b1b",
                  }}
                >
                  {technician.active ? "نشط" : "موقوف"}
                </span>
                {canManage && (
                  <button type="button" onClick={() => startEdit(technician)} style={secondaryButtonStyle}>
                    تعديل
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 10px 30px rgba(15,23,42,.05)",
};

const fieldStyle: CSSProperties = { display: "grid", gap: 7, fontWeight: 800, color: "#334155" };
const inputStyle: CSSProperties = { minHeight: 44, boxSizing: "border-box", width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", background: "white", font: "inherit" };
const secondaryButtonStyle: CSSProperties = { minHeight: 40, border: "1px solid #cbd5e1", borderRadius: 10, background: "white", color: "#0f2d4a", padding: "0 14px", cursor: "pointer", fontWeight: 800 };
const errorStyle: CSSProperties = { marginTop: 14, padding: 12, borderRadius: 10, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" };
const successStyle: CSSProperties = { marginTop: 14, padding: 12, borderRadius: 10, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" };
