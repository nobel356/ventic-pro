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

  const schema = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Ventic Pro",
    url: appUrl,
    description:
      "حلول التهوية والتركيب للحمامات والمطابخ والهود وخطوط الطرد.",
    areaServed: {
      "@type": "Country",
      name: "Egypt",
    },
    sameAs,
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
