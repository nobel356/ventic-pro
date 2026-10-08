import type { MetadataRoute } from "next";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://ventic-pro-v11-7.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/order",
    "/customer",
    "/faq",
    "/services/bathroom-ventilation",
    "/services/kitchen-ventilation",
    "/services/hood-exhaust",
    "/legal/terms",
    "/legal/privacy",
    "/legal/refund",
    "/legal/warranty",
  ];

  return paths.map((path) => ({
    url: `${appUrl}${path}`,
    lastModified: new Date(),
    changeFrequency:
      path === "" || path === "/order"
        ? "weekly"
        : "monthly",
    priority:
      path === ""
        ? 1
        : path === "/order"
          ? 0.95
          : path.startsWith("/services/")
            ? 0.8
            : 0.5,
  }));
}
