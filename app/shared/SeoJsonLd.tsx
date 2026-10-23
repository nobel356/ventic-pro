import { siteConfig } from "@/lib/site-config";

export default function SeoJsonLd() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ventic-pro-v11-7.vercel.app";

  const sameAs = [
    siteConfig.facebook,
    siteConfig.instagram,
    siteConfig.tiktok,
    siteConfig.youtube,
  ].filter(Boolean);

  const contactPoint =
    siteConfig.supportPhone || siteConfig.supportEmail
      ? {
          "@type": "ContactPoint",
          telephone: siteConfig.supportPhone || undefined,
          email: siteConfig.supportEmail || undefined,
          contactType: "customer service",
          areaServed: "EG",
          availableLanguage: ["ar"],
        }
      : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Ventic Pro",
    legalName: siteConfig.legalName,
    url: appUrl,
    description:
      "حلول التهوية والتركيب للحمامات والمطابخ والهود وخطوط الطرد.",
    telephone: siteConfig.supportPhone || undefined,
    email: siteConfig.supportEmail || undefined,
    areaServed: {
      "@type": "Country",
      name: "Egypt",
    },
    contactPoint,
    sameAs,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "خدمات Ventic Pro",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "تهوية الحمامات",
            url: `${appUrl.replace(/\/$/, "")}/services/bathroom-ventilation`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "تهوية المطابخ",
            url: `${appUrl.replace(/\/$/, "")}/services/kitchen-ventilation`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "تركيب الهود وخطوط الطرد",
            url: `${appUrl.replace(/\/$/, "")}/services/hood-exhaust`,
          },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}
