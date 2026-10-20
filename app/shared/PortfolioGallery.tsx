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

function youtubeEmbed(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

function tiktokEmbed(id: string) {
  return `https://www.tiktok.com/player/v1/${id}?autoplay=0&controls=1&rel=0&description=0&music_info=0`;
}

export default function PortfolioGallery({
  limit,
  showAllLink = false,
}: {
  limit?: number;
  showAllLink?: boolean;
}) {
  const [items, setItems] = useState<PortfolioVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/portfolio-videos", { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : { items: [] },
      )
      .then((data) => {
        if (active) {
          setItems(Array.isArray(data?.items) ? data.items : []);
        }
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

  if (loading || items.length === 0) return null;

  const visible =
    typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <section
      dir="rtl"
      style={{
        maxWidth: 1180,
        margin: "54px auto 0",
        padding: "0 18px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <span
            style={{
              color: "#0284c7",
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            تنفيذ حقيقي من Ventic Pro
          </span>

          <h2
            style={{
              color: "#071a2b",
              fontSize: "clamp(27px,4vw,36px)",
              margin: "6px 0 5px",
            }}
          >
            شوف شغلنا على الطبيعة
          </h2>

          <p
            style={{
              color: "#64748b",
              margin: 0,
              lineHeight: 1.8,
            }}
          >
            فيديوهات من YouTube وTikTok لتنفيذات فعلية بعد موافقة العملاء.
          </p>
        </div>

        {showAllLink && items.length > visible.length && (
          <Link
            href="/works"
            style={{
              color: "#0369a1",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            كل الأعمال ←
          </Link>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: 14,
        }}
      >
        {visible.map((item) => {
          const isYouTube =
            item.blobPathname?.startsWith("youtube:");
          const isTikTok =
            item.blobPathname?.startsWith("tiktok:");

          const videoId = isYouTube
            ? item.blobPathname?.slice("youtube:".length)
            : isTikTok
              ? item.blobPathname?.slice("tiktok:".length)
              : null;

          if (!videoId) return null;

          return (
            <article
              key={item.id}
              style={{
                minWidth: 0,
                background: "white",
                border: "1px solid #dbe7ef",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow:
                  "0 12px 34px rgba(7,26,43,.08)",
              }}
            >
              <div
                style={{
                  aspectRatio: "9 / 16",
                  maxHeight: 520,
                  background: "#071a2b",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <iframe
                  src={
                    isYouTube
                      ? youtubeEmbed(videoId)
                      : tiktokEmbed(videoId)
                  }
                  title={item.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  style={{
                    width: "100%",
                    height: "100%",
                    border: 0,
                    background: "#071a2b",
                  }}
                />
              </div>

              <div style={{ padding: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: "#0b2f49",
                      fontSize: 16,
                    }}
                  >
                    {item.title}
                  </strong>

                  <span
                    style={{
                      borderRadius: 999,
                      padding: "4px 8px",
                      background: isYouTube
                        ? "#fff1f2"
                        : "#0f172a",
                      color: isYouTube
                        ? "#b91c1c"
                        : "white",
                      fontSize: 10,
                      fontWeight: 900,
                    }}
                  >
                    {isYouTube ? "YouTube" : "TikTok"}
                  </span>
                </div>

                {(item.serviceType || item.location) && (
                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    {item.serviceType && (
                      <span style={chipStyle}>
                        {item.serviceType}
                      </span>
                    )}

                    {item.location && (
                      <span style={chipStyle}>
                        📍 {item.location}
                      </span>
                    )}
                  </div>
                )}

                {item.caption && (
                  <p
                    style={{
                      color: "#64748b",
                      lineHeight: 1.75,
                      margin: "10px 0 0",
                      fontSize: 13,
                    }}
                  >
                    {item.caption}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 9px",
  background: "#eef8fd",
  color: "#075985",
  fontSize: 11,
  fontWeight: 800,
};
