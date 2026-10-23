import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ventic-pro-v11-7.vercel.app"
  ).replace(/\/$/, "");

  const staticPaths: Array<[
    string,
    MetadataRoute.Sitemap[number]["changeFrequency"],
    number,
  ]> = [
    ["/", "weekly", 1],
    ["/order", "monthly", 0.9],
    ["/calculator", "monthly", 0.9],
    ["/works", "weekly", 0.9],
    ["/offers", "daily", 0.8],
    ["/why-ventic", "monthly", 0.8],
    ["/faq", "monthly", 0.7],
    ["/areas", "weekly", 0.8],
    ["/services/bathroom-ventilation", "monthly", 0.9],
    ["/services/kitchen-ventilation", "monthly", 0.9],
    ["/services/hood-exhaust", "monthly", 0.9],
    ["/legal/terms", "yearly", 0.3],
    ["/legal/privacy", "yearly", 0.3],
    ["/legal/refund", "yearly", 0.3],
    ["/legal/warranty", "yearly", 0.4],
  ];

  let areaRows: Array<{ governorate: string; area: string }> = [];

  try {
    areaRows = await prisma.serviceArea.findMany({
      where: { active: true },
      select: { governorate: true, area: true },
      orderBy: [{ governorate: "asc" }, { area: "asc" }],
    });
  } catch {
    areaRows = [];
  }

  const now = new Date();

  return [
    ...staticPaths.map(([path, changeFrequency, priority]) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...areaRows.map((item) => ({
      url: `${base}/areas/${encodeURIComponent(item.governorate)}/${encodeURIComponent(item.area)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
