"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PortfolioVideo = {
  id: string;
  title: string;
  caption: string | null;
  location: string | null;
  serviceType: string | null;
  blobUrl: string;
  blobPathname?: string;
  sortOrder: number;
};

const embed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`;

export default function PortfolioGallery({ limit, showAllLink = false }: { limit?: number; showAllLink?: boolean }) {
  const [items, setItems] = useState<PortfolioVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/portfolio-videos", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((data) => { if (active) setItems(Array.isArray(data?.items) ? data.items : []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading || items.length === 0) return null;
  const visible = typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <section dir="rtl" style={{ maxWidth: 1180, margin: "54px auto 0", padding: "0 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 13 }}>تنفيذ حقيقي من Ventic Pro</span>
          <h2 style={{ color: "#071a2b", fontSize: "clamp(27px,4vw,36px)", margin: "6px 0 5px" }}>شوف شغلنا على الطبيعة</h2>
          <p style={{ color: "#64748b", margin: 0, lineHeight: 1.8 }}>فيديوهات من تنفيذات فعلية لعملائنا بعد موافقتهم على العرض.</p>
        </div>
        {showAllLink && items.length > visible.length && <Link href="/works" style={{ color: "#0369a1", fontWeight: 900, textDecoration: "none" }}>كل الأعمال ←</Link>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {visible.map((item) => {
          const youtubeId = item.blobPathname?.startsWith("youtube:") ? item.blobPathname.slice(8) : null;
          return (
            <article key={item.id} style={{ minWidth: 0, background: "white", border: "1px solid #dbe7ef", borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 34px rgba(7,26,43,.08)" }}>
              <div style={{ aspectRatio: "9 / 16", maxHeight: 520, background: "#071a2b", display: "grid", placeItems: "center" }}>
                {youtubeId ? (
                  <iframe src={embed(youtubeId)} title={item.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen style={{ width: "100%", height: "100%", border: 0, background: "#071a2b" }} />
                ) : (
                  <video src={item.blobUrl} controls playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#071a2b" }} />
                )}
              </div>
              <div style={{ padding: 14 }}>
                <strong style={{ display: "block", color: "#0b2f49", fontSize: 16 }}>{item.title}</strong>
                {(item.serviceType || item.location) && <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>{item.serviceType && <span style={chipStyle}>{item.serviceType}</span>}{item.location && <span style={chipStyle}>📍 {item.location}</span>}</div>}
                {item.caption && <p style={{ color: "#64748b", lineHeight: 1.75, margin: "10px 0 0", fontSize: 13 }}>{item.caption}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const chipStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", background: "#eef8fd", color: "#075985", fontSize: 11, fontWeight: 800 };
