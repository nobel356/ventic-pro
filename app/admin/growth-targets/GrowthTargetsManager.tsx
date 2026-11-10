"use client";

import { useEffect, useState } from "react";

type Target = {
  key: string;
  label: string;
  targetValue: number;
};

export default function GrowthTargetsManager() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/admin/growth-targets", {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error || "تعذر تحميل Targets.");
      return;
    }

    setTargets(data?.targets || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(item: Target, value: number) {
    const res = await fetch("/api/admin/growth-targets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: item.key,
        targetValue: value,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error || "تعذر الحفظ.");
      return;
    }

    setMessage("تم حفظ Target.");
    await load();
  }

  return (
    <div dir="rtl" style={{ display: "grid", gap: 14 }}>
      <div>
        <h1 style={{ marginBottom: 6, color: "#071a2b" }}>
          Growth Targets
        </h1>
        <p style={{ color: "#64748b", lineHeight: 1.7 }}>
          حدد الحد الأدنى المقبول لكل KPI. الهدف هنا Guardrail لاتخاذ القرار، مش رقم تجميلي.
        </p>
      </div>

      {message && <div style={info}>{message}</div>}

      <div style={grid}>
        {targets.map((item) => (
          <TargetCard key={item.key} item={item} onSave={save} />
        ))}
      </div>
    </div>
  );
}

function TargetCard({
  item,
  onSave,
}: {
  item: Target;
  onSave: (item: Target, value: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(item.targetValue));

  useEffect(() => {
    setValue(String(item.targetValue));
  }, [item.targetValue]);

  return (
    <div style={card}>
      <strong style={{ color: "#0b2f49" }}>{item.label}</strong>
      <small style={{ color: "#64748b" }}>{item.key}</small>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          style={input}
        />
        <button
          type="button"
          onClick={() => void onSave(item, Number(value))}
          style={button}
        >
          حفظ
        </button>
      </div>
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 10,
};
const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 8,
};
const input: React.CSSProperties = {
  flex: 1,
  minHeight: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 9px",
  font: "inherit",
};
const button: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  background: "#0b2f49",
  color: "white",
  fontWeight: 900,
  padding: "0 12px",
};
const info: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1e40af",
  border: "1px solid #bfdbfe",
  borderRadius: 10,
  padding: 10,
};
