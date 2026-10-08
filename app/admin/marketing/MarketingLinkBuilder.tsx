"use client";

import { useMemo, useState } from "react";

export default function MarketingLinkBuilder() {
  const [source, setSource] =
    useState("Facebook");
  const [medium, setMedium] =
    useState("paid_social");
  const [campaign, setCampaign] =
    useState("");
  const [content, setContent] =
    useState("");
  const [copied, setCopied] =
    useState(false);

  const link = useMemo(() => {
    const origin =
      typeof window !==
      "undefined"
        ? window.location.origin
        : "";

    const params =
      new URLSearchParams();

    if (source) {
      params.set(
        "utm_source",
        source,
      );
      params.set(
        "source",
        source,
      );
    }
    if (medium) {
      params.set(
        "utm_medium",
        medium,
      );
    }
    if (campaign) {
      params.set(
        "utm_campaign",
        campaign,
      );
    }
    if (content) {
      params.set(
        "utm_content",
        content,
      );
    }

    return `${origin}/order?${params.toString()}`;
  }, [
    source,
    medium,
    campaign,
    content,
  ]);

  return (
    <section
      style={{
        background: "white",
        border:
          "1px solid #e2e8f0",
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(190px,1fr))",
          gap: 10,
        }}
      >
        <Field label="المصدر">
          <select
            value={source}
            onChange={(event) =>
              setSource(
                event.target.value,
              )
            }
            style={inputStyle}
          >
            <option>Facebook</option>
            <option>Instagram</option>
            <option>TikTok</option>
            <option>Google</option>
            <option>WhatsApp</option>
            <option>Referral</option>
            <option>Organic</option>
          </select>
        </Field>

        <Field label="النوع">
          <input
            value={medium}
            onChange={(event) =>
              setMedium(
                event.target.value,
              )
            }
            style={inputStyle}
          />
        </Field>

        <Field label="اسم الحملة">
          <input
            value={campaign}
            onChange={(event) =>
              setCampaign(
                event.target.value,
              )
            }
            placeholder="october_launch"
            style={inputStyle}
          />
        </Field>

        <Field label="نسخة الإعلان">
          <input
            value={content}
            onChange={(event) =>
              setContent(
                event.target.value,
              )
            }
            placeholder="video_01"
            style={inputStyle}
          />
        </Field>
      </div>

      <div
        dir="ltr"
        style={{
          marginTop: 16,
          background: "#f8fafc",
          border:
            "1px solid #e2e8f0",
          borderRadius: 10,
          padding: 12,
          overflowWrap: "anywhere",
          color: "#0f2d4a",
        }}
      >
        {link}
      </div>

      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(
            link,
          );
          setCopied(true);
          window.setTimeout(
            () => setCopied(false),
            1600,
          );
        }}
        style={{
          marginTop: 10,
          border: 0,
          borderRadius: 10,
          background: "#f97316",
          color: "white",
          padding: "10px 14px",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {copied
          ? "تم النسخ ✓"
          : "نسخ رابط الحملة"}
      </button>
    </section>
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
    <label
      style={{
        display: "grid",
        gap: 6,
        fontWeight: 800,
        color: "#0f2d4a",
      }}
    >
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  minHeight: 44,
  width: "100%",
  border:
    "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 10px",
  background: "white",
};
