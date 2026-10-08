import type { MetadataRoute } from "next";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://ventic-pro-v11-7.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/order", "/services/", "/faq", "/legal/"],
        disallow: [
          "/admin/",
          "/technician/",
          "/api/",
          "/customer/account/",
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
