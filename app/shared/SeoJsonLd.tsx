import { siteConfig } from "@/lib/site-config";

export default function SeoJsonLd() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ventic-pro-v11-7.vercel.app";

  const baseUrl = appUrl.replace(/\/$/, "");
  const businessId = `${baseUrl}/#business`;
  const websiteId = `${baseUrl}/#website`;

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
    "@graph": [
      {
        "@type": "HomeAndConstructionBusiness",
        "@id": businessId,
        name: "Ventic Pro",
        legalName: siteConfig.legalName,
        url: baseUrl,
        logo: {
          "@type": "ImageObject",
          url: `${baseUrl}/icon.png`,
        },
        image: `${baseUrl}/social-preview.png`,
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
                url: `${baseUrl}/services/bathroom-ventilation`,
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "تهوية المطابخ",
                url: `${baseUrl}/services/kitchen-ventilation`,
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "تركيب الهود وخطوط الطرد",
                url: `${baseUrl}/services/hood-exhaust`,
              },
            },
          ],
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: baseUrl,
        name: "Ventic Pro",
        inLanguage: "ar-EG",
        publisher: {
          "@id": businessId,
        },
      },
    ],
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
