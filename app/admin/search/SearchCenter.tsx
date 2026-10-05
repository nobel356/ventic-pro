"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";

type SearchItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
};

type SearchGroup = {
  key: string;
  label: string;
  items: SearchItem[];
};

export default function SearchCenter() {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/admin/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "تعذر البحث");
        }

        setGroups(data?.groups || []);
      } catch (err: any) {
        setError(err?.message || "تعذر البحث");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const total = groups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={searchBoxStyle}>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="اكتب رقم طلب، اسم، موبايل، فاتورة، فني، عنوان، جهاز أو مورد..."
          style={searchInputStyle}
        />
        <small style={{ color: "#64748b" }}>
          البحث يبدأ بعد حرفين ويبحث في كل الأقسام من شاشة واحدة.
        </small>
      </section>

      {loading && <div style={cardStyle}>جاري البحث...</div>}
      {error && <div style={errorStyle}>{error}</div>}

      {!loading && query.trim().length >= 2 && !error && (
        <div style={{ color: "#64748b" }}>
          {total ? `${total} نتيجة` : "لا توجد نتائج"}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.key} style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>{group.label}</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {group.items.map((item) => (
              <Link key={item.id} href={item.href} style={resultStyle}>
                <strong>{item.title}</strong>
                <small style={{ color: "#64748b", lineHeight: 1.5 }}>
                  {item.meta}
                </small>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const searchBoxStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 18,
  display: "grid",
  gap: 8,
};

const searchInputStyle: CSSProperties = {
  minHeight: 54,
  border: "2px solid #bfdbfe",
  borderRadius: 13,
  padding: "0 16px",
  fontSize: 17,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const cardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};

const resultStyle: CSSProperties = {
  textDecoration: "none",
  color: "#0f2d4a",
  border: "1px solid #e2e8f0",
  borderRadius: 11,
  padding: 11,
  display: "grid",
  gap: 3,
  background: "#f8fafc",
};

const errorStyle: CSSProperties = {
  padding: 11,
  borderRadius: 10,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};
