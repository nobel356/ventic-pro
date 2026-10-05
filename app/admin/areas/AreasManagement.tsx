"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

type AreaItem = {
  id: string;
  governorate: string;
  area: string;
  travelFee: number;
  serviceDays: string;
  active: boolean;
  technicianIds: string[];
  technicianNames: string[];
};

type Technician = {
  id: string;
  name: string;
};

export default function AreasManagement() {
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    governorate: "القاهرة",
    area: "",
    travelFee: "0",
    serviceDays: "السبت - الخميس",
    active: true,
    technicianIds: [] as string[],
  });

  async function load() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/areas", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحميل المناطق");
      }

      setAreas(data?.areas || []);
      setTechnicians(data?.technicians || []);
      setError("");
    } catch (err: any) {
      setError(err?.message || "تعذر تحميل المناطق");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return areas;

    return areas.filter((item) =>
      [
        item.governorate,
        item.area,
        item.serviceDays,
        ...item.technicianNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [areas, search]);

  function startEdit(item: AreaItem) {
    setEditingId(item.id);
    setForm({
      governorate: item.governorate,
      area: item.area,
      travelFee: String(item.travelFee),
      serviceDays: item.serviceDays,
      active: item.active,
      technicianIds: item.technicianIds,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId("");
    setForm({
      governorate: "القاهرة",
      area: "",
      travelFee: "0",
      serviceDays: "السبت - الخميس",
      active: true,
      technicianIds: [],
    });
  }

  function toggleTech(id: string) {
    setForm((current) => ({
      ...current,
      technicianIds: current.technicianIds.includes(id)
        ? current.technicianIds.filter((value) => value !== id)
        : [...current.technicianIds, id],
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          ...form,
          travelFee: Number(form.travelFee || 0),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر حفظ المنطقة");
      }

      setMessage(
        editingId
          ? "تم تحديث المنطقة ورسومها والفنيين المرتبطين بها."
          : "تمت إضافة المنطقة.",
      );
      reset();
      await load();
    } catch (err: any) {
      setError(err?.message || "تعذر حفظ المنطقة");
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
              {editingId ? "تعديل منطقة الخدمة" : "إضافة منطقة خدمة"}
            </h2>
            <p style={mutedStyle}>
              رسوم الانتقال والفنيون وأيام الخدمة تُستخدم من نفس السجل بدل تكرارها في أكثر من مكان.
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
              label="المحافظة"
              value={form.governorate}
              onChange={(value) => setForm({ ...form, governorate: value })}
              required
            />
            <Input
              label="المنطقة"
              value={form.area}
              onChange={(value) => setForm({ ...form, area: value })}
              required
            />
            <Input
              label="رسوم الانتقال"
              type="number"
              value={form.travelFee}
              onChange={(value) => setForm({ ...form, travelFee: value })}
            />
            <Input
              label="أيام الخدمة"
              value={form.serviceDays}
              onChange={(value) => setForm({ ...form, serviceDays: value })}
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
                {form.active ? "المنطقة متاحة" : "موقوفة"}
              </span>
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <strong>الفنيون المتاحون في المنطقة</strong>
            <div style={techGridStyle}>
              {technicians.map((tech) => (
                <label key={tech.id} style={techChoiceStyle}>
                  <input
                    type="checkbox"
                    checked={form.technicianIds.includes(tech.id)}
                    onChange={() => toggleTech(tech.id)}
                  />
                  {tech.name}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{ ...primaryButtonStyle, marginTop: 14 }}
          >
            {saving ? "جاري الحفظ..." : "حفظ المنطقة"}
          </button>
        </form>
      </section>

      {message && <div style={successStyle}>{message}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      <section style={cardStyle}>
        <div style={headStyle}>
          <div>
            <h2 style={{ margin: 0 }}>المناطق المسجلة</h2>
            <p style={mutedStyle}>
              أي أوردر جديد في منطقة مسجلة يأخذ رسوم الانتقال تلقائيًا كسعر Snapshot.
            </p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث في المنطقة أو الفني..."
            style={{ ...inputStyle, maxWidth: 320 }}
          />
        </div>

        {loading ? (
          <p>جاري التحميل...</p>
        ) : visible.length === 0 ? (
          <p>لا توجد مناطق مطابقة.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 14 }}>
            <table style={{ width: "100%", minWidth: 900 }}>
              <thead>
                <tr>
                  <th>المحافظة</th>
                  <th>المنطقة</th>
                  <th>رسوم الانتقال</th>
                  <th>أيام الخدمة</th>
                  <th>الفنيون</th>
                  <th>الحالة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td>{item.governorate}</td>
                    <td><strong>{item.area}</strong></td>
                    <td>{item.travelFee.toLocaleString("ar-EG")} ج</td>
                    <td>{item.serviceDays || "-"}</td>
                    <td>
                      {item.technicianNames.length
                        ? item.technicianNames.join("، ")
                        : "بدون فنيين محددين"}
                    </td>
                    <td>{item.active ? "متاحة" : "موقوفة"}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
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
        type={type}
        value={value}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
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
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
  padding: "0 10px",
  font: "inherit",
  boxSizing: "border-box",
  width: "100%",
};

const toggleStyle: CSSProperties = {
  ...inputStyle,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const techGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 8,
  marginTop: 8,
};

const techChoiceStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 9,
  padding: 9,
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
