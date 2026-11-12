import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ø®Ø¯Ù…Ø§Øª Ventic Pro",
  description:
    "Ø§Ø³ØªØ¹Ø±Ø¶ Ø®Ø¯Ù…Ø§Øª Ventic Pro Ù„ØªÙ‡ÙˆÙŠØ© Ø§Ù„Ø­Ù…Ø§Ù…Ø§Øª ÙˆØ§Ù„Ù…Ø·Ø§Ø¨Ø®ØŒ Ø§Ù„Ù‡ÙˆØ¯ ÙˆØ®Ø·ÙˆØ· Ø§Ù„Ø·Ø±Ø¯ØŒ Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Ø§Ù„Ø´ÙØ§Ø·Ø§ØªØŒ Ø§Ù„Ø¯ÙƒØª ÙˆØªØ´Ø®ÙŠØµ Ù…Ø´Ø§ÙƒÙ„ Ø§Ù„ØªÙ‡ÙˆÙŠØ©.",
  alternates: { canonical: "/services" },
};

const services = [
  {
    href: "/services/bathroom-ventilation",
    icon: "ðŸ’¨",
    title: "ØªÙ‡ÙˆÙŠØ© Ø§Ù„Ø­Ù…Ø§Ù…Ø§Øª",
    text: "ØªØ±ÙƒÙŠØ¨ Ø£Ùˆ Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Ø´ÙØ§Ø· Ø§Ù„Ø­Ù…Ø§Ù… ÙˆÙ…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„ÙØªØ­Ø© ÙˆÙ…Ø³Ø§Ø± Ø§Ù„Ø·Ø±Ø¯ ÙˆØ§Ù„ØªØ¬Ù‡ÙŠØ²Ø§Øª.",
  },
  {
    href: "/services/kitchen-ventilation",
    icon: "ðŸ³",
    title: "ØªÙ‡ÙˆÙŠØ© Ø§Ù„Ù…Ø·Ø§Ø¨Ø®",
    text: "Ø­Ù„ÙˆÙ„ Ø³Ø­Ø¨ Ø§Ù„Ø±ÙˆØ§Ø¦Ø­ ÙˆØ§Ù„Ø­Ø±Ø§Ø±Ø© Ø­Ø³Ø¨ Ù…Ø³Ø§Ø­Ø© Ø§Ù„Ù…Ø·Ø¨Ø® ÙˆÙ…ÙƒØ§Ù† Ø®Ø±ÙˆØ¬ Ø§Ù„Ù‡ÙˆØ§Ø¡.",
  },
  {
    href: "/services/hood-exhaust",
    icon: "â†—",
    title: "Ù‡ÙˆØ¯ ÙˆØ®Ø·ÙˆØ· Ø§Ù„Ø·Ø±Ø¯",
    text: "ØªØ±ÙƒÙŠØ¨ Ø§Ù„Ù‡ÙˆØ¯ ÙˆÙ…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù‚Ø·Ø± ÙˆØ·ÙˆÙ„ Ø§Ù„Ø¯ÙƒØª ÙˆØ§Ù„Ø£ÙƒÙˆØ§Ø¹ ÙˆÙ…ÙƒØ§Ù† Ø§Ù„Ø®Ø±ÙˆØ¬.",
  },
  {
    href: "/services/fan-replacement",
    icon: "âŸ³",
    title: "Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Ø§Ù„Ø´ÙØ§Ø·",
    text: "ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ø´ÙØ§Ø· Ø§Ù„Ø­Ø§Ù„ÙŠ ÙˆØ§Ø³ØªØ¨Ø¯Ø§Ù„Ù‡ Ø¨Ø­Ù„ ÙŠÙ†Ø§Ø³Ø¨ Ø§Ù„ÙØªØ­Ø© ÙˆÙ…Ø³Ø§Ø± Ø§Ù„Ø·Ø±Ø¯ Ø¨Ø¯Ù„ ØªØºÙŠÙŠØ± Ø¹Ø´ÙˆØ§Ø¦ÙŠ.",
  },
  {
    href: "/services/ductwork",
    icon: "â–°",
    title: "Ø§Ù„Ø¯ÙƒØª ÙˆÙ…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ø·Ø±Ø¯",
    text: "Ù…Ø±Ø§Ø¬Ø¹Ø© Ø·ÙˆÙ„ Ø§Ù„Ù…Ø³Ø§Ø± ÙˆØ§Ù„Ù‚Ø·Ø± ÙˆØ§Ù„Ø£ÙƒÙˆØ§Ø¹ ÙˆØ§Ù„ÙˆØµÙ„Ø§Øª ÙˆØªØ£Ø«ÙŠØ±Ù‡Ø§ Ø¹Ù„Ù‰ Ø§Ù„Ø³Ø­Ø¨ ÙˆØ§Ù„Ø¶ÙˆØ¶Ø§Ø¡.",
  },
  {
    href: "/services/ventilation-troubleshooting",
    icon: "âŒ•",
    title: "Ø­Ù„ Ù…Ø´Ø§ÙƒÙ„ Ø§Ù„ØªÙ‡ÙˆÙŠØ©",
    text: "ØªØ´Ø®ÙŠØµ Ø¶Ø¹Ù Ø§Ù„Ø³Ø­Ø¨ ÙˆØ§Ù„Ø±Ø·ÙˆØ¨Ø© ÙˆØ§Ù„Ø±ÙˆØ§Ø¦Ø­ ÙˆØ§Ù„Ø¶ÙˆØ¶Ø§Ø¡ Ù‚Ø¨Ù„ Ø§Ù‚ØªØ±Ø§Ø­ ØªØºÙŠÙŠØ± Ø§Ù„Ø¬Ù‡Ø§Ø².",
  },
] as const;

export default function ServicesPage() {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://ventic-pro.com"
  ).replace(/\/$/, "");

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${baseUrl}/services#services`,
    url: `${baseUrl}/services`,
    name: "Ø®Ø¯Ù…Ø§Øª Ventic Pro",
    inLanguage: "ar-EG",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: services.map((service, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Service",
          name: service.title,
          description: service.text,
          url: `${baseUrl}${service.href}`,
          provider: {
            "@id": `${baseUrl}/#business`,
          },
        },
      })),
    },
  };

  return (
    <main dir="rtl" style={{ minHeight: "70vh" }}>
      {/* V98_SERVICES_HUB */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "96px 18px 28px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(145deg,#f7fbfe,#eef8fd)",
            border: "1px solid #d7e9f3",
            borderRadius: 26,
            padding: "clamp(24px,5vw,48px)",
          }}
        >
          <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 13 }}>
            Ø®Ø¯Ù…Ø§Øª Ø§Ù„ØªÙ‡ÙˆÙŠØ© ÙˆØ§Ù„ØªØ±ÙƒÙŠØ¨
          </span>
          <h1
            style={{
              color: "#071a2b",
              fontSize: "clamp(36px,7vw,58px)",
              lineHeight: 1.15,
              margin: "8px 0 14px",
            }}
          >
            Ø§Ø®ØªØ§Ø± Ø§Ù„Ù…Ø´ÙƒÙ„Ø©ØŒ Ù…Ø´ Ù…Ø¬Ø±Ø¯ Ø§Ø³Ù… Ø§Ù„Ø¬Ù‡Ø§Ø²
          </h1>
          <p
            style={{
              color: "#475569",
              lineHeight: 1.9,
              fontSize: 17,
              maxWidth: 850,
            }}
          >
            Ø§Ù„Ø­Ù„ Ø§Ù„Ù…Ù†Ø§Ø³Ø¨ ÙŠØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙƒØ§Ù† ÙˆÙ…Ø³Ø§Ø± Ø®Ø±ÙˆØ¬ Ø§Ù„Ù‡ÙˆØ§Ø¡ ÙˆØ·ÙˆÙ„ Ø§Ù„Ø¯ÙƒØª ÙˆØ§Ù„Ø£ÙƒÙˆØ§Ø¹
            ÙˆØ§Ù„ØªØ¬Ù‡ÙŠØ²Ø§Øª. Ø§Ø®ØªØ§Ø± Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ø£Ù‚Ø±Ø¨ Ù„Ø­Ø§Ù„ØªÙƒØŒ ÙˆÙ„Ùˆ Ù…Ø´ Ù…ØªØ£ÙƒØ¯ Ø§Ø³ØªØ®Ø¯Ù… ØªØ´Ø®ÙŠØµ
            Ù…Ø´Ø§ÙƒÙ„ Ø§Ù„ØªÙ‡ÙˆÙŠØ© Ø£Ùˆ Ø§Ø±ÙØ¹ ØµÙˆØ± Ø§Ù„Ù…ÙƒØ§Ù† Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨.
          </p>

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 18 }}>
            <Link
              className="button"
              href="/order?utm_source=Organic&utm_medium=services_hub&utm_campaign=services"
              data-track="order_intent"
              data-track-label="services_hub"
            >
              Ø§Ø¨Ø¯Ø£ Ø·Ù„Ø¨
            </Link>
            <Link className="outline" href="/calculator">
              Ø§Ø­Ø³Ø¨ Ø³Ø¹Ø± Ù…Ø¨Ø¯Ø¦ÙŠ
            </Link>
            <Link className="outline" href="/works">
              Ø´ÙˆÙ Ø£Ø¹Ù…Ø§Ù„Ù†Ø§
            </Link>
            <Link className="outline" href="/areas">
              Ù…Ù†Ø§Ø·Ù‚ Ø§Ù„Ø®Ø¯Ù…Ø©
            </Link>
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1180,
          margin: "22px auto 0",
          padding: "0 18px 42px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 12,
          }}
        >
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              style={{
                minHeight: 190,
                display: "grid",
                alignContent: "start",
                gap: 9,
                background: "white",
                border: "1px solid #dbe7ef",
                borderRadius: 18,
                padding: 20,
                textDecoration: "none",
                boxShadow: "0 8px 24px rgba(15,23,42,.05)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 13,
                  background: "#eef8fd",
                  color: "#075985",
                  fontSize: 21,
                  fontWeight: 900,
                }}
              >
                {service.icon}
              </span>
              <strong style={{ color: "#0b2f49", fontSize: 19 }}>
                {service.title}
              </strong>
              <span style={{ color: "#64748b", lineHeight: 1.8 }}>
                {service.text}
              </span>
              <span style={{ color: "#075985", fontWeight: 900, fontSize: 13 }}>
                ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø®Ø¯Ù…Ø© â†
              </span>
            </Link>
          ))}
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 18,
            border: "1px solid #bae6fd",
            borderRadius: 16,
            background: "#f0f9ff",
            color: "#0f2d4a",
            lineHeight: 1.8,
          }}
        >
          <strong>Ù…Ù‡Ù… Ù‚Ø¨Ù„ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø´ÙØ§Ø·:</strong>{" "}
          Ù‚ÙŠÙ…Ø© ØªØ¯ÙÙ‚ Ø§Ù„Ù‡ÙˆØ§Ø¡ Ø§Ù„Ù…ÙƒØªÙˆØ¨Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø¬Ù‡Ø§Ø² ÙˆØ­Ø¯Ù‡Ø§ Ù„Ø§ ØªÙƒÙÙŠ Ù„Ùˆ ÙÙŠÙ‡ Ø¯ÙƒØª Ø·ÙˆÙŠÙ„ Ø£Ùˆ
          Ø£ÙƒÙˆØ§Ø¹. Ø§Ù„Ù…Ù‚Ø§ÙˆÙ…Ø© Ø§Ù„ÙØ¹Ù„ÙŠØ© Ù„Ù„Ù…Ø³Ø§Ø± ØªØ¤Ø«Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø¯Ø§Ø¡ØŒ Ù„Ø°Ù„Ùƒ Ù†Ø±Ø§Ø¬Ø¹ Ø§Ù„Ù…Ø³Ø§Ø± Ù‚Ø¨Ù„
          ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ù„.
        </div>
      </section>
    </main>
  );
}
