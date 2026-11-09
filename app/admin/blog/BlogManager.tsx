"use client";

import { useEffect, useMemo, useState } from "react";
import BlogWorkflowPanel from "./BlogWorkflowPanel";

type Section = {
  heading: string;
  paragraphs: string[];
  bullets: string[];
  note?: string | null;
};

type Article = {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  readingMinutes: number;
  serviceHref: string;
  serviceLabel: string;
  sections: Section[];
  faq: [string, string][];
  sources: [string, string][];
  visualPath: string | null;
  visualStoragePath?: string | null;
  scheduledAt?: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  publishedAt: string | null;
  updatedAt: string;
};

const categories = [
  "تهوية الحمامات",
  "تهوية المطابخ",
  "هود وخطوط الطرد",
  "دليل التكلفة",
];

function blank(): Article {
  return {
    id: "",
    slug: "",
    title: "",
    description: "",
    excerpt: "",
    category: "تهوية الحمامات",
    status: "DRAFT",
    readingMinutes: 5,
    serviceHref: "/services/bathroom-ventilation",
    serviceLabel: "خدمة تهوية الحمامات",
    sections: [
      {
        heading: "عنوان القسم",
        paragraphs: [""],
        bullets: [],
        note: null,
      },
    ],
    faq: [],
    sources: [],
    visualPath: "",
    visualStoragePath: null,
    scheduledAt: null,
    seoTitle: "",
    seoDescription: "",
    sortOrder: 0,
    publishedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function patch<T extends keyof Article>(
  article: Article,
  key: T,
  value: Article[T],
): Article {
  return { ...article, [key]: value };
}

export default function BlogManager() {
  const [items, setItems] = useState<Article[]>([]);
  const [draft, setDraft] = useState<Article>(blank());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"content" | "seo" | "faq" | "sources" | "workflow">("content");

  async function load() {
    const res = await fetch("/api/admin/blog", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error || "تعذر تحميل المقالات.");
      return;
    }

    const next = Array.isArray(data?.items) ? data.items : [];
    setItems(next);

    if (!draft.id && next[0]) {
      setDraft(next[0]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      if (status !== "ALL" && item.status !== status) return false;
      if (category !== "ALL" && item.category !== category) return false;

      if (!q) return true;

      return [item.title, item.slug, item.description, item.category]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, status, category]);

  async function save() {
    if (!draft.title.trim()) {
      setMessage("اكتب عنوان المقال.");
      return;
    }

    if (!draft.description.trim() || !draft.excerpt.trim()) {
      setMessage("الوصف والملخص مطلوبان.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/blog", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "تعذر حفظ المقال.");
      }

      setMessage(
        draft.status === "PUBLISHED"
          ? "تم حفظ المقال ونشره."
          : "تم حفظ المقال كمسودة.",
      );

      await load();

      if (!draft.id && data?.id) {
        const fresh = await fetch("/api/admin/blog", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({}));

        const created = fresh?.items?.find((x: Article) => x.id === data.id);
        if (created) setDraft(created);
      }
    } catch (error: any) {
      setMessage(error?.message || "تعذر حفظ المقال.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft.id) return;

    if (
      !window.confirm(
        `حذف المقال "${draft.title}" نهائيًا من إدارة المقالات؟`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/blog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "تعذر حذف المقال.");

      setMessage("تم حذف المقال.");
      setDraft(blank());
      await load();
    } catch (error: any) {
      setMessage(error?.message || "تعذر حذف المقال.");
    } finally {
      setBusy(false);
    }
  }

  function updateSection(index: number, next: Partial<Section>) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, i) =>
        i === index ? { ...section, ...next } : section,
      ),
    }));
  }

  function addSection() {
    setDraft((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          heading: "قسم جديد",
          paragraphs: [""],
          bullets: [],
          note: null,
        },
      ],
    }));
  }

  function removeSection(index: number) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.filter((_, i) => i !== index),
    }));
  }

  function updateFaq(index: number, next: [string, string]) {
    setDraft((current) => ({
      ...current,
      faq: current.faq.map((item, i) => (i === index ? next : item)),
    }));
  }

  function updateSource(index: number, next: [string, string]) {
    setDraft((current) => ({
      ...current,
      sources: current.sources.map((item, i) => (i === index ? next : item)),
    }));
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(280px,360px) minmax(0,1fr)",
        gap: 16,
      }}
      className="vpBlogCmsGrid"
    >
      <aside style={panel}>
        <div style={{ display: "grid", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setDraft(blank());
              setTab("content");
              setMessage("");
            }}
            style={primaryButton}
          >
            + مقال جديد
          </button>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث في المقالات..."
            style={input}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={input}
            >
              <option value="ALL">كل الحالات</option>
              <option value="PUBLISHED">منشور</option>
              <option value="SCHEDULED">مجدول</option>
              <option value="DRAFT">مسودة</option>
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={input}
            >
              <option value="ALL">كل الأقسام</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setDraft(item);
                setMessage("");
              }}
              style={{
                ...articleButton,
                borderColor:
                  draft.id === item.id ? "#38bdf8" : "#dbe7ef",
                background:
                  draft.id === item.id ? "#f0f9ff" : "white",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: item.status === "PUBLISHED" ? "#166534" : "#9a3412",
                }}
              >
                {item.status === "PUBLISHED" ? "● منشور" : "○ مسودة"}
              </span>
              <strong style={{ color: "#0b2f49", lineHeight: 1.5 }}>
                {item.title}
              </strong>
              <small style={{ color: "#64748b" }}>{item.category}</small>
            </button>
          ))}
        </div>
      </aside>

      <section style={panel}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <strong style={{ color: "#0b2f49", fontSize: 19 }}>
              {draft.id ? "تعديل المقال" : "مقال جديد"}
            </strong>
            {draft.id && (
              <small style={{ display: "block", color: "#64748b", marginTop: 3 }}>
                /blog/{draft.slug}
              </small>
            )}
          </div>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {draft.id && draft.status === "PUBLISHED" && (
              <a
                href={`/blog/${draft.slug}`}
                target="_blank"
                rel="noreferrer"
                style={secondaryButton}
              >
                معاينة ↗
              </a>
            )}
            {draft.id && (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy}
                style={dangerButton}
              >
                حذف
              </button>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              style={primaryButton}
            >
              {busy ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>

        {message && <div style={messageBox}>{message}</div>}

        <div style={tabs}>
          {[
            ["content", "المحتوى"],
            ["seo", "SEO"],
            ["faq", "FAQ"],
            ["sources", "المصادر"],
            ["workflow", "النشر"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key as any)}
              style={{
                ...tabButton,
                ...(tab === key ? activeTab : {}),
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "content" && (
          <div style={{ display: "grid", gap: 14 }}>
            <Field label="العنوان">
              <input
                value={draft.title}
                onChange={(e) => setDraft(patch(draft, "title", e.target.value))}
                style={input}
              />
            </Field>

            <div style={twoCol}>
              <Field label="Slug">
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft(patch(draft, "slug", e.target.value))}
                  style={input}
                  dir="ltr"
                />
              </Field>

              <Field label="الحالة">
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft(
                      patch(
                        draft,
                        "status",
                        e.target.value as Article["status"],
                      ),
                    )
                  }
                  style={input}
                >
                  <option value="DRAFT">مسودة</option>
                  <option value="PUBLISHED">منشور</option>
                </select>
              </Field>
            </div>

            <div style={twoCol}>
              <Field label="التصنيف">
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft(patch(draft, "category", e.target.value))
                  }
                  style={input}
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>

              <Field label="زمن القراءة بالدقائق">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={draft.readingMinutes}
                  onChange={(e) =>
                    setDraft(
                      patch(
                        draft,
                        "readingMinutes",
                        Number(e.target.value) || 1,
                      ),
                    )
                  }
                  style={input}
                />
              </Field>
            </div>

            <Field label="الوصف">
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft(patch(draft, "description", e.target.value))
                }
                style={textarea}
              />
            </Field>

            <Field label="الملخص">
              <textarea
                value={draft.excerpt}
                onChange={(e) =>
                  setDraft(patch(draft, "excerpt", e.target.value))
                }
                style={textarea}
              />
            </Field>

            <div style={twoCol}>
              <Field label="رابط CTA">
                <input
                  value={draft.serviceHref}
                  onChange={(e) =>
                    setDraft(patch(draft, "serviceHref", e.target.value))
                  }
                  style={input}
                  dir="ltr"
                />
              </Field>

              <Field label="نص CTA">
                <input
                  value={draft.serviceLabel}
                  onChange={(e) =>
                    setDraft(patch(draft, "serviceLabel", e.target.value))
                  }
                  style={input}
                />
              </Field>
            </div>

            <div style={sectionHeader}>
              <h3 style={{ margin: 0, color: "#0b2f49" }}>أقسام المقال</h3>
              <button type="button" onClick={addSection} style={secondaryButton}>
                + إضافة قسم
              </button>
            </div>

            {draft.sections.map((section, index) => (
              <div key={index} style={sectionCard}>
                <div style={sectionHeader}>
                  <strong>قسم {index + 1}</strong>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    style={dangerMini}
                  >
                    حذف القسم
                  </button>
                </div>

                <input
                  value={section.heading}
                  onChange={(e) =>
                    updateSection(index, { heading: e.target.value })
                  }
                  style={input}
                  placeholder="عنوان القسم"
                />

                <textarea
                  value={section.paragraphs.join("\n\n")}
                  onChange={(e) =>
                    updateSection(index, {
                      paragraphs: e.target.value
                        .split(/\n\s*\n/)
                        .map((x) => x.trim())
                        .filter(Boolean),
                    })
                  }
                  style={{ ...textarea, minHeight: 150 }}
                  placeholder="الفقرات — افصل كل فقرة بسطر فارغ"
                />

                <textarea
                  value={section.bullets.join("\n")}
                  onChange={(e) =>
                    updateSection(index, {
                      bullets: e.target.value
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    })
                  }
                  style={textarea}
                  placeholder="النقاط — نقطة في كل سطر"
                />

                <input
                  value={section.note || ""}
                  onChange={(e) =>
                    updateSection(index, {
                      note: e.target.value || null,
                    })
                  }
                  style={input}
                  placeholder="ملاحظة اختيارية"
                />
              </div>
            ))}
          </div>
        )}

        {tab === "seo" && (
          <div style={{ display: "grid", gap: 14 }}>
            <Field label="SEO Title">
              <input
                value={draft.seoTitle || ""}
                onChange={(e) =>
                  setDraft(patch(draft, "seoTitle", e.target.value))
                }
                style={input}
              />
            </Field>

            <Field label="SEO Description">
              <textarea
                value={draft.seoDescription || ""}
                onChange={(e) =>
                  setDraft(patch(draft, "seoDescription", e.target.value))
                }
                style={textarea}
              />
            </Field>

            <Field label="مسار الصورة">
              <input
                value={draft.visualPath || ""}
                onChange={(e) =>
                  setDraft(patch(draft, "visualPath", e.target.value))
                }
                style={input}
                dir="ltr"
                placeholder="/blog/visuals/article.svg"
              />
            </Field>

            <Field label="الترتيب">
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDraft(
                    patch(draft, "sortOrder", Number(e.target.value) || 0),
                  )
                }
                style={input}
              />
            </Field>

            <div style={seoPreview}>
              <small style={{ color: "#64748b" }}>Google preview</small>
              <strong style={{ color: "#1a0dab", fontSize: 20, lineHeight: 1.4 }}>
                {draft.seoTitle || draft.title || "عنوان المقال"}
              </strong>
              <span style={{ color: "#006621", fontSize: 12 }} dir="ltr">
                ventic-pro.com/blog/{draft.slug || "article-slug"}
              </span>
              <p style={{ color: "#4d5156", lineHeight: 1.6, margin: 0 }}>
                {draft.seoDescription ||
                  draft.description ||
                  "وصف المقال سيظهر هنا."}
              </p>
            </div>
          </div>
        )}

        {tab === "faq" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={sectionHeader}>
              <h3 style={{ margin: 0, color: "#0b2f49" }}>الأسئلة الشائعة</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    faq: [...current.faq, ["", ""]],
                  }))
                }
                style={secondaryButton}
              >
                + سؤال
              </button>
            </div>

            {draft.faq.map(([question, answer], index) => (
              <div key={index} style={sectionCard}>
                <input
                  value={question}
                  onChange={(e) =>
                    updateFaq(index, [e.target.value, answer])
                  }
                  style={input}
                  placeholder="السؤال"
                />
                <textarea
                  value={answer}
                  onChange={(e) =>
                    updateFaq(index, [question, e.target.value])
                  }
                  style={textarea}
                  placeholder="الإجابة"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      faq: current.faq.filter((_, i) => i !== index),
                    }))
                  }
                  style={dangerMini}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "sources" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={sectionHeader}>
              <h3 style={{ margin: 0, color: "#0b2f49" }}>المراجع</h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    sources: [...current.sources, ["", ""]],
                  }))
                }
                style={secondaryButton}
              >
                + مرجع
              </button>
            </div>

            {draft.sources.map(([label, url], index) => (
              <div key={index} style={sectionCard}>
                <input
                  value={label}
                  onChange={(e) =>
                    updateSource(index, [e.target.value, url])
                  }
                  style={input}
                  placeholder="اسم المرجع"
                />
                <input
                  value={url}
                  onChange={(e) =>
                    updateSource(index, [label, e.target.value])
                  }
                  style={input}
                  dir="ltr"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      sources: current.sources.filter((_, i) => i !== index),
                    }))
                  }
                  style={dangerMini}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "workflow" && draft.id && (
          <BlogWorkflowPanel
            article={draft}
            onChanged={async () => {
              const res = await fetch("/api/admin/blog", {
                cache: "no-store",
              });
              const data = await res.json().catch(() => ({}));
              const next = Array.isArray(data?.items) ? data.items : [];
              setItems(next);
              const updated = next.find((item: Article) => item.id === draft.id);
              if (updated) setDraft(updated);
            }}
          />
        )}

      </section>

      <style>{`
        @media (max-width: 980px) {
          .vpBlogCmsGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#334155", fontWeight: 900, fontSize: 12 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const panel: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 10px 30px rgba(15,23,42,.05)",
  alignSelf: "start",
};

const input: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "9px 10px",
  font: "inherit",
  boxSizing: "border-box",
};

const textarea: React.CSSProperties = {
  ...input,
  minHeight: 100,
  resize: "vertical",
};

const twoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 10,
};

const primaryButton: React.CSSProperties = {
  minHeight: 42,
  border: 0,
  borderRadius: 10,
  padding: "9px 14px",
  background: "#0b2f49",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: "#eef8fd",
  color: "#075985",
  border: "1px solid #bae6fd",
};

const dangerButton: React.CSSProperties = {
  ...primaryButton,
  background: "#fff1f2",
  color: "#be123c",
  border: "1px solid #fecdd3",
};

const dangerMini: React.CSSProperties = {
  ...dangerButton,
  minHeight: 34,
  padding: "6px 9px",
  fontSize: 11,
};

const articleButton: React.CSSProperties = {
  width: "100%",
  textAlign: "right",
  display: "grid",
  gap: 4,
  border: "1px solid #dbe7ef",
  borderRadius: 12,
  padding: 11,
  cursor: "pointer",
};

const messageBox: React.CSSProperties = {
  background: "#f0f9ff",
  border: "1px solid #bae6fd",
  color: "#075985",
  borderRadius: 10,
  padding: 10,
  marginBottom: 12,
  fontWeight: 800,
};

const tabs: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  marginBottom: 16,
};

const tabButton: React.CSSProperties = {
  border: "1px solid #dbe7ef",
  borderRadius: 999,
  background: "white",
  color: "#475569",
  padding: "7px 11px",
  fontWeight: 900,
  cursor: "pointer",
};

const activeTab: React.CSSProperties = {
  background: "#0b2f49",
  color: "white",
  borderColor: "#0b2f49",
};

const sectionCard: React.CSSProperties = {
  display: "grid",
  gap: 8,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  padding: 12,
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const seoPreview: React.CSSProperties = {
  display: "grid",
  gap: 5,
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  padding: 14,
};
