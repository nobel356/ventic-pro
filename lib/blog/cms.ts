import { prisma } from "@/lib/prisma";
import {
  blogArticles as staticArticles,
  type BlogArticle,
} from "@/lib/blog/articles";

type DbBlogArticle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  status: string;
  readingMinutes: number;
  serviceHref: string;
  serviceLabel: string;
  sections: unknown;
  faq: unknown;
  sources: unknown;
  visualPath: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function asSections(value: unknown): BlogArticle["sections"] {
  return Array.isArray(value) ? (value as BlogArticle["sections"]) : [];
}

function asFaq(value: unknown): BlogArticle["faq"] {
  return Array.isArray(value) ? (value as BlogArticle["faq"]) : [];
}

function asSources(value: unknown): BlogArticle["sources"] {
  return Array.isArray(value) ? (value as BlogArticle["sources"]) : [];
}

export type CmsBlogArticle = BlogArticle & {
  id?: string;
  status?: string;
  visualPath?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  sortOrder?: number;
};

function normalize(row: DbBlogArticle): CmsBlogArticle {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    excerpt: row.excerpt,
    category: row.category,
    publishedAt: (row.publishedAt || row.createdAt)
      .toISOString()
      .slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
    readingMinutes: row.readingMinutes,
    serviceHref: row.serviceHref,
    serviceLabel: row.serviceLabel,
    sections: asSections(row.sections),
    faq: asFaq(row.faq),
    sources: asSources(row.sources),
    id: row.id,
    status: row.status,
    visualPath: row.visualPath,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    sortOrder: row.sortOrder,
  };
}

export async function getPublishedBlogArticles(): Promise<CmsBlogArticle[]> {
  try {
    const rows = await prisma.blogArticle.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [
        { sortOrder: "asc" },
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    if (rows.length) {
      return rows.map((row) => normalize(row as DbBlogArticle));
    }
  } catch (error) {
    console.error("[blog-cms-list-fallback]", (error as Error)?.message);
  }

  return staticArticles;
}

export async function getPublishedBlogArticle(
  slug: string,
): Promise<CmsBlogArticle | null> {
  try {
    const row = await prisma.blogArticle.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
      },
    });

    if (row) return normalize(row as DbBlogArticle);
  } catch (error) {
    console.error("[blog-cms-one-fallback]", (error as Error)?.message);
  }

  return staticArticles.find((article) => article.slug === slug) || null;
}

export function relatedCmsArticles(
  articles: CmsBlogArticle[],
  article: CmsBlogArticle,
  limit = 3,
) {
  const same = articles.filter(
    (item) =>
      item.slug !== article.slug &&
      item.category === article.category,
  );
  const others = articles.filter(
    (item) =>
      item.slug !== article.slug &&
      item.category !== article.category,
  );
  return [...same, ...others].slice(0, limit);
}
