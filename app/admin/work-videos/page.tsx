"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  title: string;
  caption: string | null;
  location: string | null;
  serviceType: string | null;
  blobUrl: string;
  blobPathname: string;
  sortOrder: number;
  customerConsent: boolean;
  isPublished: boolean;
  createdAt: string;
};

const emptyForm = {
  title: "",
  youtubeUrl: "",
  caption: "",
  location: "",
  serviceType: "",
  sortOrder: 0,
  customerConsent: false,
  isPublished: false,
};

function extractYouTubeId(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] || null;
    }
  } catch {}

  return null;
}

function embed(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export default function WorkVideosAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const previewId = useMemo(() => extractYouTubeId(form.youtubeUrl), [form.youtubeUrl]);

  async function load() {
    const res = await fetch("/api/admin/portfolio-videos", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data?.error || "تعذر تحميل الفيديوهات.");
    setItems(Array.isArray(data?.items) ? data.items : []);
  }

  useEffect(() => { void load(); }, []);

  async function addVideo() {
    if (!form.title.trim()) return setMessage("اكتب عنوان الفيديو.");
    const videoId = extractYouTubeId(form.youtubeUrl);
    if (!videoId) return setMessage("حط لينك YouTube صحيح.");
    if (form.isPublished && !form.customerConsent) {
      return setMessage("لا يمكن النشر قبل تأكيد موافقة العميل.");
    }

    setBusy(true);
    setMessage("جاري حفظ الفيديو...");

    try {
      const res = await fetch("/api/admin/portfolio-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          caption: form.caption,
          location: form.location,
          serviceType: form.serviceType,
          sortOrder: form.sortOrder,
          customerConsent: form.customerConsent,
          isPublished: form.isPublished,
          blobUrl: `https://www.youtube.com/watch?v=${videoId}`,
          blobPathname: `youtube:${videoId}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "تعذر حفظ الفيديو.");
      setForm(emptyForm);
      setMessage("تم إضافة فيديو YouTube بنجاح.");
      await load();
    } catch (e: any) {
      setMessage(e?.message || "تعذر حفظ الفيديو.");
    } finally {
      setBusy(false);
    }
  }

  async function save(item: Item) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/portfolio-videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "تعذر حفظ التعديلات.");
      setMessage("تم حفظ التعديلات.");
      await load();
    } catch (e: any) {
      setMessage(e?.message || "تعذر حفظ التعديلات.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Item) {
    if (!window.confirm(`حذف \"${item.title}\" من الموقع؟`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/portfolio-videos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "تعذر حذف الفيديو.");
      setMessage("تم حذف الفيديو من الموقع.");
      await load();
    } catch (e: any) {
      setMessage(e?.message || "تعذر حذف الفيديو.");
    } finally {
      setBusy(false);
    }
  }

  function patchItem(id: string, patch: Partial<Item>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  return (
    <main dir="rtl" className="vpPortfolioAdminPage" style={{ width: "min(1180px,calc(100% - 28px))", margin: "0 auto", padding: "18px 0 110px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 13 }}>Ventic Pro Portfolio</span>
          <span style={{ background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 900 }}>YouTube Mode V17A</span>
        </div>
        <h1 style={{ color: "#071a2b", margin: "5px 0 7px" }}>فيديوهات التنفيذ</h1>
        <p style={{ color: "#64748b", lineHeight: 1.8, margin: 0 }}>ارفع الفيديو على YouTube ثم الصق اللينك هنا. الموقع هيعرضه مباشرة بدون رفع ملفات على Vercel.</p>
      </div>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0, color: "#0b2f49" }}>إضافة فيديو YouTube</h2>
        <div style={gridStyle}>
          <label style={fieldStyle}><span>عنوان الفيديو *</span><input value={form.title} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} style={inputStyle} placeholder="مثال: تركيب هود وخط طرد" /></label>
          <label style={fieldStyle}><span>لينك YouTube *</span><input value={form.youtubeUrl} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, youtubeUrl: e.target.value }))} style={inputStyle} dir="ltr" placeholder="https://youtu.be/..." /></label>
          <label style={fieldStyle}><span>نوع الخدمة</span><input value={form.serviceType} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, serviceType: e.target.value }))} style={inputStyle} /></label>
          <label style={fieldStyle}><span>المنطقة</span><input value={form.location} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, location: e.target.value }))} style={inputStyle} /></label>
          <label style={fieldStyle}><span>الترتيب</span><input type="number" value={form.sortOrder} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, sortOrder: Number(e.target.value) || 0 }))} style={inputStyle} /></label>
        </div>

        <label style={{ ...fieldStyle, marginTop: 12 }}><span>وصف مختصر</span><textarea value={form.caption} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, caption: e.target.value }))} style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} /></label>

        {previewId && <div style={{ marginTop: 14 }}><strong style={{ display: "block", color: "#0b2f49", marginBottom: 7 }}>معاينة</strong><div style={{ width: "min(100%,420px)", aspectRatio: "9 / 16", borderRadius: 14, overflow: "hidden", background: "#071a2b" }}><iframe src={embed(previewId)} title="Preview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen style={{ width: "100%", height: "100%", border: 0 }} /></div></div>}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <label style={checkStyle}><input type="checkbox" checked={form.customerConsent} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, customerConsent: e.target.checked }))} /> عندي موافقة العميل على عرض الفيديو للعامة</label>
          <label style={checkStyle}><input type="checkbox" checked={form.isPublished} disabled={busy} onChange={(e) => setForm((v) => ({ ...v, isPublished: e.target.checked }))} /> نشر فورًا على الموقع</label>
        </div>

        <button type="button" disabled={busy} onClick={() => void addVideo()} style={{ ...primaryButton, opacity: busy ? .65 : 1 }}>{busy ? "جاري الحفظ..." : "إضافة الفيديو للموقع"}</button>
      </section>

      {message && <div style={{ margin: "14px 0", padding: 12, borderRadius: 12, background: "#eef8fd", border: "1px solid #cfe8f5", color: "#0b2f49", fontWeight: 800 }}>{message}</div>}

      <section style={{ marginTop: 22 }}>
        <h2 style={{ color: "#071a2b" }}>الفيديوهات الحالية ({items.length})</h2>
        <div style={{ display: "grid", gap: 14 }}>
          {items.map((item) => {
            const youtubeId = item.blobPathname.startsWith("youtube:") ? item.blobPathname.slice(8) : null;
            return <article key={item.id} style={cardStyle}><div className="vpPortfolioAdminRow" style={{ display: "grid", gridTemplateColumns: "minmax(180px,260px) 1fr", gap: 16 }}>
              {youtubeId ? <iframe src={embed(youtubeId)} title={item.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen style={{ width: "100%", aspectRatio: "9 / 16", maxHeight: 390, border: 0, borderRadius: 14, background: "#071a2b" }} /> : <video src={item.blobUrl} controls playsInline style={{ width: "100%", aspectRatio: "9 / 16", maxHeight: 390, objectFit: "contain", background: "#071a2b", borderRadius: 14 }} />}
              <div>
                <div style={gridStyle}>
                  <label style={fieldStyle}><span>العنوان</span><input value={item.title} onChange={(e) => patchItem(item.id, { title: e.target.value })} style={inputStyle} /></label>
                  <label style={fieldStyle}><span>نوع الخدمة</span><input value={item.serviceType || ""} onChange={(e) => patchItem(item.id, { serviceType: e.target.value })} style={inputStyle} /></label>
                  <label style={fieldStyle}><span>المنطقة</span><input value={item.location || ""} onChange={(e) => patchItem(item.id, { location: e.target.value })} style={inputStyle} /></label>
                  <label style={fieldStyle}><span>الترتيب</span><input type="number" value={item.sortOrder} onChange={(e) => patchItem(item.id, { sortOrder: Number(e.target.value) || 0 })} style={inputStyle} /></label>
                </div>
                <label style={{ ...fieldStyle, marginTop: 10 }}><span>الوصف</span><textarea value={item.caption || ""} onChange={(e) => patchItem(item.id, { caption: e.target.value })} style={{ ...inputStyle, minHeight: 78, resize: "vertical" }} /></label>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                  <label style={checkStyle}><input type="checkbox" checked={item.customerConsent} onChange={(e) => patchItem(item.id, { customerConsent: e.target.checked })} /> موافقة العميل</label>
                  <label style={checkStyle}><input type="checkbox" checked={item.isPublished} onChange={(e) => patchItem(item.id, { isPublished: e.target.checked })} /> منشور</label>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}><button type="button" disabled={busy} onClick={() => void save(item)} style={primaryButton}>حفظ</button><button type="button" disabled={busy} onClick={() => void remove(item)} style={dangerButton}>حذف من الموقع</button></div>
              </div>
            </div></article>;
          })}
          {items.length === 0 && <div style={{ ...cardStyle, color: "#64748b" }}>مفيش فيديوهات مضافة لسه.</div>}
        </div>
      </section>

      <style>{`@media(max-width:720px){.vpPortfolioAdminRow{grid-template-columns:1fr!important}.vpPortfolioAdminRow>video,.vpPortfolioAdminRow>iframe{width:min(100%,360px)!important;margin:0 auto}}`}</style>
    </main>
  );
}

const cardStyle: React.CSSProperties = { background: "white", border: "1px solid #dbe7ef", borderRadius: 18, padding: 18, boxShadow: "0 10px 30px rgba(7,26,43,.07)" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 };
const fieldStyle: React.CSSProperties = { display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 800 };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 46, border: "1px solid #dbe4ec", borderRadius: 11, padding: "10px 12px", background: "white", color: "#0f172a", font: "inherit" };
const checkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, color: "#334155", fontWeight: 800, fontSize: 13 };
const primaryButton: React.CSSProperties = { minHeight: 44, border: 0, borderRadius: 11, background: "linear-gradient(135deg,#0a84ff,#0574d4)", color: "white", padding: "10px 16px", fontWeight: 900, cursor: "pointer", marginTop: 14 };
const dangerButton: React.CSSProperties = { minHeight: 44, border: "1px solid #fecaca", borderRadius: 11, background: "#fef2f2", color: "#b91c1c", padding: "10px 16px", fontWeight: 900, cursor: "pointer", marginTop: 14 };
