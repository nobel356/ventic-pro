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
  seoPublished: boolean;
  seoTitle: string;
  seoDescription: string;
  seoIntro: string;
  seoHighlights: string[];
  seoFaq: [string, string][];
  seoReady: boolean;
};

type Technician = {
  id: string;
  name: string;
};

const blankForm = () => ({
  governorate: "القاهرة",
  area: "",
  travelFee: "0",
  serviceDays: "السبت - الخميس",
  active: true,
  technicianIds: [] as string[],
  seoPublished: false,
  seoTitle: "",
  seoDescription: "",
  seoIntro: "",
  seoHighlights: ["", ""],
  seoFaq: [
    ["", ""] as [string, string],
    ["", ""] as [string, string],
  ],
});

export default function AreasManagement() {
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(blankForm());

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
        item.seoTitle,
        item.seoDescription,
        ...item.technicianNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [areas, search]);

  const readiness = useMemo(() => {
    const highlights = form.seoHighlights
      .map((item) => item.trim())
      .filter(Boolean);
    const faq = form.seoFaq.filter(
      ([q, a]) => q.trim() && a.trim(),
    );

    return {
      title: form.seoTitle.trim().length >= 20,
      description:
        form.seoDescription.trim().length >= 80,
      intro: form.seoIntro.trim().length >= 120,
      highlights: highlights.length >= 2,
      faq: faq.length >= 2,
    };
  }, [form]);

  const seoReady = Object.values(readiness).every(Boolean);

  function startEdit(item: AreaItem) {
    setEditingId(item.id);
    setForm({
      governorate: item.governorate,
      area: item.area,
      travelFee: String(item.travelFee),
      serviceDays: item.serviceDays,
      active: item.active,
      technicianIds: item.technicianIds,
      seoPublished: item.seoPublished,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      seoIntro: item.seoIntro,
      seoHighlights:
        item.seoHighlights.length >= 2
          ? item.seoHighlights
          : ["", ""],
      seoFaq:
        item.seoFaq.length >= 2
          ? item.seoFaq
          : [
              ["", ""],
              ["", ""],
            ],
    });
    setMessage("");
    setError("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function reset() {
    setEditingId("");
    setForm(blankForm());
  }

  function toggleTech(id: string) {
    setForm((current) => ({
      ...current,
      technicianIds: current.technicianIds.includes(id)
        ? current.technicianIds.filter((value) => value !== id)
        : [...current.technicianIds, id],
    }));
  }

  function updateFaq(
    index: number,
    next: [string, string],
  ) {
    setForm((current) => ({
      ...current,
      seoFaq: current.seoFaq.map((item, i) =>
        i === index ? next : item,
      ),
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId || undefined,
          ...form,
          travelFee: Number(form.travelFee || 0),
          seoHighlights: form.seoHighlights
            .map((item) => item.trim())
            .filter(Boolean),
          seoFaq: form.seoFaq.filter(
            ([q, a]) => q.trim() && a.trim(),
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "تعذر حفظ المنطقة",
        );
      }

      setMessage(
        editingId
          ? "تم تحديث المنطقة وإعدادات Local SEO."
          : "تمت إضافة المنطقة.",
      );
      reset();
      await load();
    } catch (err: any) {
      setError(
        err?.message || "تعذر حفظ المنطقة",
      );
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
              {editingId
                ? "تعديل منطقة الخدمة"
                : "إضافة منطقة خدمة"}
            </h2>
            <p style={mutedStyle}>
              التشغيل وLocal SEO منفصلان: ممكن المنطقة تكون متاحة للطلبات بدون نشر صفحة SEO ضعيفة.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={reset}
              style={secondaryButtonStyle}
            >
              إلغاء التعديل
            </button>
          )}
        </div>

        <form onSubmit={save}>
          <div style={gridStyle}>
            <Input
              label="المحافظة"
              value={form.governorate}
              onChange={(value) =>
                setForm({
                  ...form,
                  governorate: value,
                })
              }
              required
            />
            <Input
              label="المنطقة"
              value={form.area}
              onChange={(value) =>
                setForm({
                  ...form,
                  area: value,
                })
              }
              required
            />
            <Input
              label="رسوم الانتقال"
              type="number"
              value={form.travelFee}
              onChange={(value) =>
                setForm({
                  ...form,
                  travelFee: value,
                })
              }
            />
            <Input
              label="أيام الخدمة"
              value={form.serviceDays}
              onChange={(value) =>
                setForm({
                  ...form,
                  serviceDays: value,
                })
              }
            />

            <label style={fieldStyle}>
              <span>الحالة التشغيلية</span>
              <span style={toggleStyle}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      active:
                        event.target.checked,
                    })
                  }
                />
                {form.active
                  ? "المنطقة متاحة"
                  : "موقوفة"}
              </span>
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <strong>
              الفنيون المتاحون في المنطقة
            </strong>
            <div style={techGridStyle}>
              {technicians.map((tech) => (
                <label
                  key={tech.id}
                  style={techChoiceStyle}
                >
                  <input
                    type="checkbox"
                    checked={form.technicianIds.includes(
                      tech.id,
                    )}
                    onChange={() =>
                      toggleTech(tech.id)
                    }
                  />
                  {tech.name}
                </label>
              ))}
            </div>
          </div>

          <section style={seoBox}>
            <div style={headStyle}>
              <div>
                <strong
                  style={{
                    color: "#0b2f49",
                    fontSize: 18,
                  }}
                >
                  Local SEO
                </strong>
                <p style={mutedStyle}>
                  الصفحة لا تدخل Sitemap ولا تتعمل لها Index إلا بعد اكتمال المحتوى وتفعيل النشر.
                </p>
              </div>

              <span
                style={{
                  ...statusPill,
                  ...(seoReady
                    ? readyPill
                    : notReadyPill),
                }}
              >
                {seoReady
                  ? "جاهزة للنشر"
                  : "المحتوى ناقص"}
              </span>
            </div>

            <div style={readinessGrid}>
              <Ready
                ok={readiness.title}
                label="SEO Title 20+"
              />
              <Ready
                ok={readiness.description}
                label="Description 80+"
              />
              <Ready
                ok={readiness.intro}
                label="Intro 120+"
              />
              <Ready
                ok={readiness.highlights}
                label="2 Highlights"
              />
              <Ready
                ok={readiness.faq}
                label="2 FAQ"
              />
            </div>

            <div style={gridStyle}>
              <Input
                label="SEO Title"
                value={form.seoTitle}
                onChange={(value) =>
                  setForm({
                    ...form,
                    seoTitle: value,
                  })
                }
              />

              <label style={fieldStyle}>
                <span>نشر Local SEO</span>
                <span style={toggleStyle}>
                  <input
                    type="checkbox"
                    checked={form.seoPublished}
                    disabled={
                      !seoReady &&
                      !form.seoPublished
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        seoPublished:
                          event.target.checked,
                      })
                    }
                  />
                  {form.seoPublished
                    ? "Index + Sitemap"
                    : "Noindex"}
                </span>
              </label>
            </div>

            <label style={fieldStyle}>
              <span>
                SEO Description
              </span>
              <textarea
                value={form.seoDescription}
                onChange={(event) =>
                  setForm({
                    ...form,
                    seoDescription:
                      event.target.value,
                  })
                }
                style={textareaStyle}
                rows={3}
              />
            </label>

            <label style={fieldStyle}>
              <span>
                مقدمة محلية حقيقية
              </span>
              <textarea
                value={form.seoIntro}
                onChange={(event) =>
                  setForm({
                    ...form,
                    seoIntro:
                      event.target.value,
                  })
                }
                style={{
                  ...textareaStyle,
                  minHeight: 130,
                }}
                rows={5}
                placeholder="اكتب تفاصيل فعلية عن التغطية أو طبيعة التنفيذ في المنطقة، بدون حشو أو ادعاءات غير حقيقية."
              />
            </label>

            <div>
              <div style={headStyle}>
                <strong>
                  نقاط محلية مميزة
                </strong>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() =>
                    setForm({
                      ...form,
                      seoHighlights: [
                        ...form.seoHighlights,
                        "",
                      ],
                    })
                  }
                >
                  + نقطة
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 7,
                  marginTop: 8,
                }}
              >
                {form.seoHighlights.map(
                  (item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        gap: 7,
                      }}
                    >
                      <input
                        value={item}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            seoHighlights:
                              form.seoHighlights.map(
                                (value, i) =>
                                  i === index
                                    ? event.target.value
                                    : value,
                              ),
                          })
                        }
                        style={inputStyle}
                        placeholder={
                          "نقطة " +
                          (index + 1)
                        }
                      />
                      {form.seoHighlights.length >
                        2 && (
                        <button
                          type="button"
                          style={removeButton}
                          onClick={() =>
                            setForm({
                              ...form,
                              seoHighlights:
                                form.seoHighlights.filter(
                                  (_, i) =>
                                    i !== index,
                                ),
                            })
                          }
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>

            <div>
              <div style={headStyle}>
                <strong>
                  FAQ خاصة بالمنطقة
                </strong>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() =>
                    setForm({
                      ...form,
                      seoFaq: [
                        ...form.seoFaq,
                        ["", ""],
                      ],
                    })
                  }
                >
                  + سؤال
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 9,
                  marginTop: 8,
                }}
              >
                {form.seoFaq.map(
                  ([question, answer], index) => (
                    <div
                      key={index}
                      style={faqCard}
                    >
                      <input
                        value={question}
                        onChange={(event) =>
                          updateFaq(index, [
                            event.target.value,
                            answer,
                          ])
                        }
                        style={inputStyle}
                        placeholder="السؤال"
                      />
                      <textarea
                        value={answer}
                        onChange={(event) =>
                          updateFaq(index, [
                            question,
                            event.target.value,
                          ])
                        }
                        style={textareaStyle}
                        rows={3}
                        placeholder="الإجابة"
                      />
                      {form.seoFaq.length > 2 && (
                        <button
                          type="button"
                          style={removeButton}
                          onClick={() =>
                            setForm({
                              ...form,
                              seoFaq:
                                form.seoFaq.filter(
                                  (_, i) =>
                                    i !== index,
                                ),
                            })
                          }
                        >
                          حذف السؤال
                        </button>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            style={{
              ...primaryButtonStyle,
              marginTop: 14,
            }}
          >
            {saving
              ? "جاري الحفظ..."
              : "حفظ المنطقة"}
          </button>
        </form>
      </section>

      {message && (
        <div style={successStyle}>
          {message}
        </div>
      )}
      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <section style={cardStyle}>
        <div style={headStyle}>
          <div>
            <h2 style={{ margin: 0 }}>
              المناطق المسجلة
            </h2>
            <p style={mutedStyle}>
              SEO Published معناها إن الصفحة مؤهلة للـIndex والـSitemap، وليس مجرد أن المنطقة متاحة تشغيليًا.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="بحث في المنطقة أو الفني..."
            style={{
              ...inputStyle,
              maxWidth: 320,
            }}
          />
        </div>

        {loading ? (
          <p>جاري التحميل...</p>
        ) : visible.length === 0 ? (
          <p>لا توجد مناطق مطابقة.</p>
        ) : (
          <div
            style={{
              overflowX: "auto",
              marginTop: 14,
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 1050,
              }}
            >
              <thead>
                <tr>
                  <th>المحافظة</th>
                  <th>المنطقة</th>
                  <th>رسوم الانتقال</th>
                  <th>أيام الخدمة</th>
                  <th>الحالة</th>
                  <th>SEO</th>
                  <th>الفنيون</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td>{item.governorate}</td>
                    <td>
                      <strong>
                        {item.area}
                      </strong>
                    </td>
                    <td>
                      {item.travelFee.toLocaleString(
                        "ar-EG",
                      )}{" "}
                      ج
                    </td>
                    <td>
                      {item.serviceDays ||
                        "-"}
                    </td>
                    <td>
                      {item.active
                        ? "متاحة"
                        : "موقوفة"}
                    </td>
                    <td>
                      <span
                        style={{
                          ...statusPill,
                          ...(item.seoPublished
                            ? readyPill
                            : item.seoReady
                              ? {
                                  background:
                                    "#eff6ff",
                                  color:
                                    "#1d4ed8",
                                }
                              : notReadyPill),
                        }}
                      >
                        {item.seoPublished
                          ? "Published"
                          : item.seoReady
                            ? "Ready"
                            : "Noindex"}
                      </span>
                    </td>
                    <td>
                      {item.technicianNames.length
                        ? item.technicianNames.join(
                            "، ",
                          )
                        : "بدون فنيين محددين"}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(item)
                        }
                        style={
                          secondaryButtonStyle
                        }
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

function Ready({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <span
      style={{
        ...miniStatus,
        background: ok
          ? "#f0fdf4"
          : "#fff7ed",
        color: ok
          ? "#166534"
          : "#9a3412",
      }}
    >
      {ok ? "✓" : "○"} {label}
    </span>
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
        min={
          type === "number"
            ? 0
            : undefined
        }
        step={
          type === "number"
            ? "0.01"
            : undefined
        }
        onChange={(event) =>
          onChange(event.target.value)
        }
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
  boxShadow:
    "0 8px 24px rgba(15,23,42,.05)",
};
const seoBox: CSSProperties = {
  marginTop: 20,
  background: "#f8fafc",
  border: "1px solid #dbe7ef",
  borderRadius: 16,
  padding: 16,
  display: "grid",
  gap: 14,
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
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 10,
  marginTop: 16,
};
const readinessGrid: CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
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
const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 90,
  padding: 10,
  resize: "vertical",
};
const toggleStyle: CSSProperties = {
  ...inputStyle,
  display: "flex",
  alignItems: "center",
  gap: 8,
};
const techGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
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
const removeButton: CSSProperties = {
  ...secondaryButtonStyle,
  color: "#be123c",
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
const statusPill: CSSProperties = {
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 900,
};
const readyPill: CSSProperties = {
  background: "#f0fdf4",
  color: "#166534",
};
const notReadyPill: CSSProperties = {
  background: "#fff7ed",
  color: "#9a3412",
};
const miniStatus: CSSProperties = {
  borderRadius: 999,
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 800,
};
const faqCard: CSSProperties = {
  display: "grid",
  gap: 7,
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 11,
  padding: 10,
};
