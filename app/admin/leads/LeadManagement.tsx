"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

type LeadItem = {
  id: string;
  phone: string | null;
  name: string | null;
  source: string | null;
  status: string;
  currentStep: number;
  consentToFollowUp: boolean;
  followUpNote: string | null;
  nextFollowUpAt: string | null;
  contactedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  STARTED: "بدأ الطلب",
  CONTACTED: "تم التواصل",
  ABANDONED: "غير مكتمل",
  CONVERTED: "تحول لطلب",
};

export default function LeadManagement() {
  const [items, setItems] = useState<LeadItem[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LeadItem | null>(null);
  const [status, setStatus] = useState("CONTACTED");
  const [note, setNote] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/leads", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحميل المتابعات");
      }

      setItems(Array.isArray(data) ? data : []);
      setError("");
    } catch (err: any) {
      setError(err?.message || "تعذر تحميل المتابعات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (filter !== "ALL" && item.status !== filter) {
        return false;
      }

      if (!q) return true;

      return [
        item.name,
        item.phone,
        item.source,
        item.followUpNote,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, search]);

  function startEdit(item: LeadItem) {
    setEditing(item);
    setStatus(item.status === "STARTED" ? "CONTACTED" : item.status);
    setNote(item.followUpNote || "");
    setNextFollowUpAt(
      item.nextFollowUpAt
        ? new Date(item.nextFollowUpAt).toISOString().slice(0, 16)
        : "",
    );
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!editing) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editing.id,
          status,
          followUpNote: note,
          nextFollowUpAt: nextFollowUpAt || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحديث المتابعة");
      }

      setMessage("تم حفظ المتابعة وتسجيلها في سجل النشاط.");
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "تعذر تحديث المتابعة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {editing && (
        <section style={cardStyle}>
          <div style={headStyle}>
            <div>
              <h2 style={{ margin: 0 }}>متابعة العميل</h2>
              <p style={mutedStyle}>
                {editing.name || "عميل"} — {editing.phone || "بدون رقم"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              style={secondaryButtonStyle}
            >
              إلغاء
            </button>
          </div>

          {!editing.consentToFollowUp && (
            <div style={warningStyle}>
              العميل لم يوافق على المتابعة. لا يتم التواصل معه حتى توجد موافقة.
            </div>
          )}

          <div style={gridStyle}>
            <label style={fieldStyle}>
              <span>الحالة</span>
              <select
                style={inputStyle}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="STARTED">بدأ الطلب</option>
                <option value="CONTACTED">تم التواصل</option>
                <option value="ABANDONED">غير مكتمل</option>
              </select>
            </label>

            <label style={fieldStyle}>
              <span>موعد المتابعة القادم</span>
              <input
                type="datetime-local"
                style={inputStyle}
                value={nextFollowUpAt}
                onChange={(event) => setNextFollowUpAt(event.target.value)}
              />
            </label>
          </div>

          <label style={{ ...fieldStyle, marginTop: 12 }}>
            <span>ملاحظات المتابعة</span>
            <textarea
              rows={3}
              style={{ ...inputStyle, padding: 10, resize: "vertical" }}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          <button
            type="button"
            disabled={saving || !editing.consentToFollowUp}
            onClick={() => void save()}
            style={{ ...primaryButtonStyle, marginTop: 12 }}
          >
            {saving ? "جاري الحفظ..." : "حفظ المتابعة"}
          </button>
        </section>
      )}

      {message && <div style={successStyle}>{message}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      <section style={cardStyle}>
        <div style={headStyle}>
          <div>
            <h2 style={{ margin: 0 }}>الطلبات غير المكتملة</h2>
            <p style={mutedStyle}>
              العميل يظهر هنا من نفس رحلة الطلب، بدون إنشاء سجل منفصل يدويًا.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالاسم أو الهاتف..."
              style={{ ...inputStyle, width: 260 }}
            />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              style={{ ...inputStyle, width: 170 }}
            >
              <option value="ALL">كل الحالات</option>
              <option value="STARTED">بدأ الطلب</option>
              <option value="CONTACTED">تم التواصل</option>
              <option value="ABANDONED">غير مكتمل</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p>جاري التحميل...</p>
        ) : visible.length === 0 ? (
          <p>لا توجد متابعات مطابقة.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 14 }}>
            <table style={{ width: "100%", minWidth: 1050 }}>
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>المصدر</th>
                  <th>الخطوة</th>
                  <th>الحالة</th>
                  <th>الموافقة</th>
                  <th>آخر نشاط</th>
                  <th>المتابعة القادمة</th>
                  <th>الملاحظة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name || "غير مسجل"}</strong>
                      <small style={{ display: "block", color: "#64748b" }}>
                        {item.phone || "بدون رقم"}
                      </small>
                    </td>
                    <td>{item.source || "غير معروف"}</td>
                    <td>{item.currentStep} / 4</td>
                    <td>{statusLabels[item.status] || item.status}</td>
                    <td>
                      {item.consentToFollowUp ? "موافق" : "بدون موافقة"}
                    </td>
                    <td>
                      {new Date(item.lastActivityAt).toLocaleString("ar-EG")}
                    </td>
                    <td>
                      {item.nextFollowUpAt
                        ? new Date(item.nextFollowUpAt).toLocaleString("ar-EG")
                        : "-"}
                    </td>
                    <td>{item.followUpNote || "-"}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        style={secondaryButtonStyle}
                      >
                        متابعة
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
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: 10,
  marginTop: 16,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 800,
  color: "#334155",
};

const inputStyle: CSSProperties = {
  minHeight: 42,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 10px",
  background: "white",
  font: "inherit",
  boxSizing: "border-box",
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

const warningStyle: CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#92400e",
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
