"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trackConversion } from "@/lib/client-conversion";

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

function youtubeEmbed(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

function tiktokEmbed(id: string) {
  return `https://www.tiktok.com/player/v1/${id}?autoplay=0&controls=1&rel=0&description=0&music_info=0`;
}

function platformOf(item: PortfolioVideo) {
  if (item.blobPathname?.startsWith("youtube:")) return "youtube";
  if (item.blobPathname?.startsWith("tiktok:")) return "tiktok";
  return null;
}

function videoIdOf(item: PortfolioVideo) {
  const platform = platformOf(item);
  if (!platform || !item.blobPathname) return null;
  return item.blobPathname.slice(`${platform}:`.length);
}

export default function PortfolioGallery({
  limit,
  showAllLink = false,
  filters = false,
}: {
  limit?: number;
  showAllLink?: boolean;
  filters?: boolean;
}) {
  const [items, setItems] = useState<PortfolioVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("ALL");
  const [service, setService] = useState("ALL");
  const [location, setLocation] = useState("ALL");

  useEffect(() => {
    let active = true;

    fetch("/api/portfolio-videos", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data) => {
        if (active) setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const services = useMemo(
    () => [...new Set(items.map((item) => item.serviceType).filter(Boolean) as string[])].sort(),
    [items],
  );
  const locations = useMemo(
    () => [...new Set(items.map((item) => item.location).filter(Boolean) as string[])].sort(),
    [items],
  );

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const itemPlatform = platformOf(item);
        if (platform !== "ALL" && itemPlatform !== platform) return false;
        if (service !== "ALL" && item.serviceType !== service) return false;
        if (location !== "ALL" && item.location !== location) return false;
        return true;
      }),
    [items, platform, service, location],
  );

  if (loading || items.length === 0) return null;

  const visible = typeof limit === "number" ? filtered.slice(0, limit) : filtered;

  return (
    <section
      dir="rtl"
      style={{
        maxWidth: 1180,
        margin: "54px auto 0",
        padding: "0 18px",
      }}
    >
      <div style={headStyle}>
        <div>
          <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 13 }}>
            تنفيذ حقيقي من Ventic Pro
          </span>
          <h2 style={{ color: "#071a2b", fontSize: "clamp(27px,4vw,36px)", margin: "6px 0 5px" }}>
            شوف شغلنا على الطبيعة
          </h2>
          <p style={{ color: "#64748b", margin: 0, lineHeight: 1.8 }}>
            فيديوهات من YouTube وTikTok لتنفيذات فعلية بعد موافقة العملاء.
          </p>
        </div>

        {showAllLink && items.length > visible.length && (
          <Link href="/works" style={allLinkStyle}>كل الأعمال ←</Link>
        )}
      </div>

      {filters && (
        <div style={filterWrap}>
          <Filter label="المنصة" value={platform} set={setPlatform} options={[
            ["ALL", "الكل"],
            ["youtube", "YouTube"],
            ["tiktok", "TikTok"],
          ]} />
          <Filter label="الخدمة" value={service} set={setService} options={[
            ["ALL", "كل الخدمات"],
            ...services.map((item) => [item, item] as [string, string]),
          ]} />
          <Filter label="المنطقة" value={location} set={setLocation} options={[
            ["ALL", "كل المناطق"],
            ...locations.map((item) => [item, item] as [string, string]),
          ]} />
        </div>
      )}

      <div style={gridStyle}>
        {visible.map((item) => {
          const itemPlatform = platformOf(item);
          const videoId = videoIdOf(item);
          if (!itemPlatform || !videoId) return null;

          return (
            <article key={item.id} style={cardStyle}>
              <VideoShell
                platform={itemPlatform}
                videoId={videoId}
                title={item.title}
              />

              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ color: "#0b2f49", fontSize: 16 }}>{item.title}</strong>
                  <span style={itemPlatform === "youtube" ? youtubeBadge : tiktokBadge}>
                    {itemPlatform === "youtube" ? "YouTube" : "TikTok"}
                  </span>
                </div>

                {(item.serviceType || item.location) && (
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
                    {item.serviceType && <span style={chipStyle}>{item.serviceType}</span>}
                    {item.location && <span style={chipStyle}>📍 {item.location}</span>}
                  </div>
                )}

                {item.caption && (
                  <p style={{ color: "#64748b", lineHeight: 1.75, margin: "10px 0 0", fontSize: 13 }}>
                    {item.caption}
                  </p>
                )}

                <Link
                  href={`/callback?service=${encodeURIComponent(item.serviceType || item.title)}`}
                  data-track="works_cta"
                  data-track-label={item.title}
                  style={ctaLink}
                >
                  عاوز تنفيذ مشابه ←
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {filters && visible.length === 0 && (
        <div style={{ ...cardStyle, padding: 18, color: "#64748b" }}>
          مفيش أعمال مطابقة للفلاتر دي. جرّب اختيار مختلف.
        </div>
      )}
    </section>
  );
}

function VideoShell({
  platform,
  videoId,
  title,
}: {
  platform: "youtube" | "tiktok";
  videoId: string;
  title: string;
}) {
  const [play, setPlay] = useState(false);

  if (play) {
    return (
      <div style={videoWrap}>
        <iframe
          src={platform === "youtube" ? youtubeEmbed(videoId) : tiktokEmbed(videoId)}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0, background: "#071a2b" }}
        />
      </div>
    );
  }

  const youtubeThumb = platform === "youtube"
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : null;

  return (
    <button
      type="button"
      onClick={() => {
        setPlay(true);
        trackConversion("works_play", { platform, title });
      }}
      aria-label={`تشغيل ${title}`}
      style={{
        ...videoWrap,
        border: 0,
        padding: 0,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(145deg,#103e5f,#071a2b)",
      }}
    >
      {youtubeThumb && (
        <img
          src={youtubeThumb}
          alt=""
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: .78 }}
        />
      )}
      <span style={playButton}>▶</span>
      <span style={platformLabel}>{platform === "youtube" ? "YouTube" : "TikTok"}</span>
    </button>
  );
}

function Filter({
  label,
  value,
  set,
  options,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label style={{ display: "grid", gap: 5, minWidth: 180 }}>
      <span style={{ color: "#64748b", fontSize: 11, fontWeight: 900 }}>{label}</span>
      <select value={value} onChange={(event) => set(event.target.value)} style={selectStyle}>
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

const headStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 14, flexWrap: "wrap", marginBottom: 18 };
const allLinkStyle: React.CSSProperties = { color: "#0369a1", fontWeight: 900, textDecoration: "none" };
const filterWrap: React.CSSProperties = { display: "flex", gap: 9, flexWrap: "wrap", background: "#f8fbfd", border: "1px solid #dbe7ef", borderRadius: 15, padding: 12, marginBottom: 16 };
const selectStyle: React.CSSProperties = { minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 9, background: "white", padding: "7px 9px", font: "inherit", color: "#0f172a" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 };
const cardStyle: React.CSSProperties = { minWidth: 0, background: "white", border: "1px solid #dbe7ef", borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 34px rgba(7,26,43,.08)" };
const videoWrap: React.CSSProperties = { width: "100%", aspectRatio: "9 / 16", maxHeight: 520, background: "#071a2b", display: "grid", placeItems: "center" };
const playButton: React.CSSProperties = { position: "absolute", width: 68, height: 68, display: "grid", placeItems: "center", borderRadius: "50%", background: "rgba(255,255,255,.92)", color: "#0b2f49", fontSize: 27, boxShadow: "0 10px 30px rgba(0,0,0,.22)" };
const platformLabel: React.CSSProperties = { position: "absolute", right: 10, bottom: 10, background: "rgba(7,26,43,.84)", color: "white", borderRadius: 999, padding: "5px 8px", fontSize: 10, fontWeight: 900 };
const chipStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 9px", background: "#eef8fd", color: "#075985", fontSize: 11, fontWeight: 800 };
const youtubeBadge: React.CSSProperties = { borderRadius: 999, padding: "4px 8px", background: "#fff1f2", color: "#b91c1c", fontSize: 10, fontWeight: 900 };
const tiktokBadge: React.CSSProperties = { ...youtubeBadge, background: "#0f172a", color: "white" };
const ctaLink: React.CSSProperties = { display: "inline-flex", marginTop: 12, color: "#0369a1", textDecoration: "none", fontWeight: 900, fontSize: 13 };
