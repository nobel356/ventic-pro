"use client";

import {
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

type PropertyItem = {
  id: string;
  label: string | null;
  governorate: string;
  area: string;
  address: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
};

type DeviceItem = {
  id: string;
  propertyId: string;
  sourceOrderId: string | null;
  type: string;
  brand: string | null;
  model: string | null;
  size: string | null;
  location: string | null;
  installedAt: string | null;
  warrantyEndsAt: string | null;
  notes: string | null;
  active: boolean;
};

export default function CustomerAssetsManager({
  customerId,
  properties,
  devices,
}: {
  customerId: string;
  properties: PropertyItem[];
  devices: DeviceItem[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"property" | "device" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [propertyForm, setPropertyForm] = useState({
    label: "",
    governorate: "",
    area: "",
    address: "",
    building: "",
    floor: "",
    apartment: "",
  });

  const [deviceForm, setDeviceForm] = useState({
    propertyId: properties[0]?.id || "",
    type: "",
    brand: "",
    model: "",
    size: "",
    location: "",
    installedAt: "",
    warrantyEndsAt: "",
    notes: "",
    active: true,
  });

  function reset() {
    setMode(null);
    setEditId(null);
    setMessage("");
    setError("");
  }

  function editProperty(item: PropertyItem) {
    setMode("property");
    setEditId(item.id);
    setPropertyForm({
      label: item.label || "",
      governorate: item.governorate,
      area: item.area,
      address: item.address,
      building: item.building || "",
      floor: item.floor || "",
      apartment: item.apartment || "",
    });
  }

  function editDevice(item: DeviceItem) {
    setMode("device");
    setEditId(item.id);
    setDeviceForm({
      propertyId: item.propertyId,
      type: item.type,
      brand: item.brand || "",
      model: item.model || "",
      size: item.size || "",
      location: item.location || "",
      installedAt: item.installedAt ? item.installedAt.slice(0, 10) : "",
      warrantyEndsAt: item.warrantyEndsAt
        ? item.warrantyEndsAt.slice(0, 10)
        : "",
      notes: item.notes || "",
      active: item.active,
    });
  }

  async function saveProperty(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/customers/${customerId}/assets`,
        {
          method: editId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: "property",
            ...(editId ? { id: editId } : {}),
            ...propertyForm,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر حفظ العقار");
      }

      setMessage("تم حفظ العقار وتسجيل العملية في سجل النشاط.");
      setMode(null);
      setEditId(null);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "تعذر حفظ العقار");
    } finally {
      setSaving(false);
    }
  }

  async function saveDevice(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/customers/${customerId}/assets`,
        {
          method: editId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: "device",
            ...(editId ? { id: editId } : {}),
            ...deviceForm,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر حفظ الجهاز");
      }

      setMessage("تم حفظ الجهاز وربطه بملف العميل.");
      setMode(null);
      setEditId(null);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "تعذر حفظ الجهاز");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={cardStyle}>
      <div style={headStyle}>
        <div>
          <h2 style={{ margin: 0 }}>إدارة العقارات والأجهزة</h2>
          <p style={mutedStyle}>
            الأجهزة الناتجة من التركيبات الجديدة تُنشأ تلقائيًا، ويمكن استكمال الماركة والموديل والمقاس هنا.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              reset();
              setMode("property");
              setPropertyForm({
                label: "",
                governorate: "",
                area: "",
                address: "",
                building: "",
                floor: "",
                apartment: "",
              });
            }}
            style={secondaryButtonStyle}
          >
            + عقار
          </button>

          <button
            type="button"
            onClick={() => {
              reset();
              setMode("device");
              setDeviceForm({
                propertyId: properties[0]?.id || "",
                type: "",
                brand: "",
                model: "",
                size: "",
                location: "",
                installedAt: "",
                warrantyEndsAt: "",
                notes: "",
                active: true,
              });
            }}
            style={primaryButtonStyle}
            disabled={properties.length === 0}
          >
            + جهاز
          </button>
        </div>
      </div>

      {mode === "property" && (
        <form onSubmit={saveProperty} style={formBoxStyle}>
          <h3>{editId ? "تعديل العقار" : "إضافة عقار"}</h3>
          <div style={gridStyle}>
            <Input label="اسم/وصف العقار" value={propertyForm.label} onChange={(v) => setPropertyForm({ ...propertyForm, label: v })} />
            <Input label="المحافظة" value={propertyForm.governorate} onChange={(v) => setPropertyForm({ ...propertyForm, governorate: v })} required />
            <Input label="المنطقة" value={propertyForm.area} onChange={(v) => setPropertyForm({ ...propertyForm, area: v })} required />
            <Input label="العنوان" value={propertyForm.address} onChange={(v) => setPropertyForm({ ...propertyForm, address: v })} required />
            <Input label="المبنى" value={propertyForm.building} onChange={(v) => setPropertyForm({ ...propertyForm, building: v })} />
            <Input label="الدور" value={propertyForm.floor} onChange={(v) => setPropertyForm({ ...propertyForm, floor: v })} />
            <Input label="الشقة" value={propertyForm.apartment} onChange={(v) => setPropertyForm({ ...propertyForm, apartment: v })} />
          </div>
          <FormActions saving={saving} onCancel={reset} />
        </form>
      )}

      {mode === "device" && (
        <form onSubmit={saveDevice} style={formBoxStyle}>
          <h3>{editId ? "تعديل الجهاز" : "إضافة جهاز"}</h3>

          <div style={gridStyle}>
            <label style={fieldStyle}>
              <span>العقار</span>
              <select
                style={inputStyle}
                value={deviceForm.propertyId}
                onChange={(e) =>
                  setDeviceForm({
                    ...deviceForm,
                    propertyId: e.target.value,
                  })
                }
                disabled={Boolean(editId)}
                required
              >
                <option value="">اختر العقار</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.label || property.address}
                  </option>
                ))}
              </select>
            </label>

            <Input label="نوع الجهاز" value={deviceForm.type} onChange={(v) => setDeviceForm({ ...deviceForm, type: v })} required />
            <Input label="الماركة" value={deviceForm.brand} onChange={(v) => setDeviceForm({ ...deviceForm, brand: v })} />
            <Input label="الموديل" value={deviceForm.model} onChange={(v) => setDeviceForm({ ...deviceForm, model: v })} />
            <Input label="المقاس" value={deviceForm.size} onChange={(v) => setDeviceForm({ ...deviceForm, size: v })} />
            <Input label="المكان" value={deviceForm.location} onChange={(v) => setDeviceForm({ ...deviceForm, location: v })} />

            {!editId && (
              <>
                <Input label="تاريخ التركيب" type="date" value={deviceForm.installedAt} onChange={(v) => setDeviceForm({ ...deviceForm, installedAt: v })} />
                <Input label="نهاية الضمان" type="date" value={deviceForm.warrantyEndsAt} onChange={(v) => setDeviceForm({ ...deviceForm, warrantyEndsAt: v })} />
              </>
            )}

            <Input label="ملاحظات" value={deviceForm.notes} onChange={(v) => setDeviceForm({ ...deviceForm, notes: v })} />

            <label style={fieldStyle}>
              <span>الحالة</span>
              <span style={toggleStyle}>
                <input
                  type="checkbox"
                  checked={deviceForm.active}
                  onChange={(e) =>
                    setDeviceForm({
                      ...deviceForm,
                      active: e.target.checked,
                    })
                  }
                />
                {deviceForm.active ? "نشط" : "خارج الخدمة"}
              </span>
            </label>
          </div>

          <FormActions saving={saving} onCancel={reset} />
        </form>
      )}

      {message && <div style={successStyle}>{message}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
        {properties.map((property) => (
          <article key={property.id} style={assetCardStyle}>
            <div style={headStyle}>
              <div>
                <strong style={{ fontSize: 17, color: "#0f2d4a" }}>
                  {property.label || "عقار"}
                </strong>
                <div style={{ color: "#64748b", marginTop: 3 }}>
                  {property.governorate} — {property.area} — {property.address}
                </div>
              </div>
              <button type="button" onClick={() => editProperty(property)} style={secondaryButtonStyle}>
                تعديل العقار
              </button>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {devices
                .filter((device) => device.propertyId === property.id)
                .map((device) => (
                  <div key={device.id} style={deviceRowStyle}>
                    <div>
                      <strong>{device.type}</strong>
                      <small style={{ display: "block", color: "#64748b" }}>
                        {[device.brand, device.model, device.size, device.location]
                          .filter(Boolean)
                          .join(" — ") || "تفاصيل الجهاز لم تُستكمل بعد"}
                      </small>
                    </div>

                    <span style={device.active ? activeBadgeStyle : inactiveBadgeStyle}>
                      {device.active ? "نشط" : "خارج الخدمة"}
                    </span>

                    <button type="button" onClick={() => editDevice(device)} style={secondaryButtonStyle}>
                      تعديل
                    </button>
                  </div>
                ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input
        style={inputStyle}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FormActions({
  saving,
  onCancel,
}: {
  saving: boolean;
  onCancel: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
      <button type="submit" disabled={saving} style={primaryButtonStyle}>
        {saving ? "جاري الحفظ..." : "حفظ"}
      </button>
      <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
        إلغاء
      </button>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,.05)",
};

const assetCardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
  background: "#f8fafc",
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
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 10,
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
  padding: "0 10px",
  background: "white",
  font: "inherit",
};

const toggleStyle: CSSProperties = {
  ...inputStyle,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const formBoxStyle: CSSProperties = {
  marginTop: 16,
  padding: 14,
  border: "1px solid #bfdbfe",
  borderRadius: 13,
  background: "#f8fbff",
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

const deviceRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(180px,1fr) auto auto",
  gap: 10,
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "white",
};

const activeBadgeStyle: CSSProperties = {
  borderRadius: 999,
  padding: "5px 9px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: 12,
  fontWeight: 900,
};

const inactiveBadgeStyle: CSSProperties = {
  ...activeBadgeStyle,
  background: "#fee2e2",
  color: "#991b1b",
};

const successStyle: CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
};

const errorStyle: CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};
