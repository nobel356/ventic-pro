import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPublishedBlogArticles } from "@/lib/blog/cms";
import { blogCategories } from "@/lib/blog/categories";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ventic-pro-v11-7.vercel.app"
  ).replace(/\/$/, "");

  const publishedArticles = await getPublishedBlogArticles();

  const staticPaths: Array<[
    string,
    MetadataRoute.Sitemap[number]["changeFrequency"],
    number,
  ]> = [
    ["/", "weekly", 1],
    ["/calculator", "monthly", 0.9],
    ["/works", "weekly", 0.9],
    ["/offers", "daily", 0.8],
    ["/why-ventic", "monthly", 0.8],
    ["/faq", "monthly", 0.7],
    ["/areas", "weekly", 0.8],
    ["/blog", "weekly", 0.85],
    ["/services/bathroom-ventilation", "monthly", 0.9],
    ["/services/kitchen-ventilation", "monthly", 0.9],
    ["/services/hood-exhaust", "monthly", 0.9],
    ["/services/fan-replacement", "monthly", 0.85],
    ["/services/ductwork", "monthly", 0.85],
    ["/services/ventilation-troubleshooting", "monthly", 0.85],
    ["/legal/terms", "yearly", 0.3],
    ["/legal/privacy", "yearly", 0.3],
    ["/legal/refund", "yearly", 0.3],
    ["/legal/warranty", "yearly", 0.4],
  ];

  let areaRows: Array<{
    governorate: string;
    area: string;
    updatedAt: Date;
  }> = [];

  try {
    areaRows = await prisma.serviceArea.findMany({
      where: {
        active: true,
        seoPublished: true,
      },
      select: {
        governorate: true,
        area: true,
        updatedAt: true,
      },
      orderBy: [
        { governorate: "asc" },
        { area: "asc" },
      ],
    });
  } catch {
    areaRows = [];
  }

  return [
    ...staticPaths.map(([path, changeFrequency, priority]) => ({
      url: `${base}${path}`,
      changeFrequency,
      priority,
    })),
    ...blogCategories.map((category) => ({
      url:
        base +
        "/blog/category/" +
        category.slug,
      changeFrequency: "weekly" as const,
      priority: 0.82,
    })),
    ...publishedArticles.map((article) => ({
      url: `${base}/blog/${article.slug}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [`${base}/blog/visuals/${article.slug}.svg`],
    })),
    ...areaRows.map((item) => ({
      url: `${base}/areas/${encodeURIComponent(item.governorate)}/${encodeURIComponent(item.area)}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
  ];
}
