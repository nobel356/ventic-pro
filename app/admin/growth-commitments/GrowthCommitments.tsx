"use client";

import { useEffect, useState } from "react";

type Commitment = {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  ownerLabel: string | null;
  note: string | null;
  dueAt: string | null;
  sourceType: string;
};

export default function GrowthCommitments() {
  const [items, setItems] = useState<Commitment[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    ownerLabel: "",
    dueAt: "",
    note: "",
  });

  async function load() {
    const res = await fetch("/api/admin/growth-commitments", {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error || "تعذر تحميل Commitments.");
      return;
    }

    setItems(data?.commitments || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    const res = await fetch("/api/admin/growth-commitments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error || "تعذر إنشاء Commitment.");
      return;
    }

    setForm({
      title: "",
      ownerLabel: "",
      dueAt: "",
      note: "",
    });
    setMessage("تم إنشاء Commitment.");
    await load();
  }

  async function update(item: Commitment, patch: Record<string, unknown>) {
    const res = await fetch("/api/admin/growth-commitments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        status: item.status,
        ...patch,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error || "تعذر التحديث.");
      return;
    }

    await load();
  }

  return (
    <div dir="rtl" style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ margin: "0 0 6px", color: "#071a2b" }}>
          Growth Commitments
        </h1>
        <p style={muted}>
          القرار بدون Owner وDue Date مجرد نية. هنا يتحول قرار الـReview إلى التزام قابل للمحاسبة.
        </p>
      </div>

      {message && <div style={info}>{message}</div>}

      <section style={card}>
        <h2 style={h2}>Commitment جديد</h2>
        <div style={grid}>
          <input
            placeholder="المهمة/القرار"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={input}
          />
          <input
            placeholder="المسؤول"
            value={form.ownerLabel}
            onChange={(e) => setForm({ ...form, ownerLabel: e.target.value })}
            style={input}
          />
          <input
            type="date"
            value={form.dueAt}
            onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
            style={input}
          />
        </div>
        <textarea
          placeholder="ملاحظة"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          rows={3}
          style={{ ...input, minHeight: 75, padding: 9 }}
        />
        <button type="button" onClick={() => void create()} style={primary}>
          إنشاء
        </button>
      </section>

      <div style={{ display: "grid", gap: 9 }}>
        {items.map((item) => {
          const overdue =
            item.dueAt &&
            new Date(item.dueAt).getTime() < Date.now() &&
            !["DONE", "CANCELLED"].includes(item.status);

          return (
            <article key={item.id} style={card}>
              <div style={head}>
                <div>
                  <span style={pill}>{item.status}</span>
                  {overdue && <span style={overduePill}>OVERDUE</span>}
                  <h3 style={{ margin: "7px 0 4px", color: "#0b2f49" }}>
                    {item.title}
                  </h3>
                  <small style={{ color: "#64748b" }}>
                    {item.ownerLabel || "بدون مسؤول"} · {item.sourceType}
                  </small>
                </div>

                <select
                  value={item.status}
                  onChange={(e) =>
                    void update(item, {
                      status: e.target.value,
                    })
                  }
                  style={input}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="DONE">Done</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const muted: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.7,
};
const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 10,
};
const h2: React.CSSProperties = {
  color: "#0b2f49",
  marginTop: 0,
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
  gap: 8,
};
const input: React.CSSProperties = {
  minHeight: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 9px",
  font: "inherit",
  background: "white",
};
const primary: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  background: "#0b2f49",
  color: "white",
  minHeight: 40,
  padding: "8px 12px",
  fontWeight: 900,
  width: "fit-content",
};
const info: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1e40af",
  border: "1px solid #bfdbfe",
  borderRadius: 10,
  padding: 10,
};
const head: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};
const pill: React.CSSProperties = {
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
  marginLeft: 5,
};
const overduePill: React.CSSProperties = {
  ...pill,
  background: "#fef2f2",
  color: "#991b1b",
};
