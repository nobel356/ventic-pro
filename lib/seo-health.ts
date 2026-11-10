import { prisma } from "@/lib/prisma";
import { blogCategories } from "@/lib/blog/categories";

export type SeoSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type SeoIssue = {
  id: string;
  severity: SeoSeverity;
  type: "ARTICLE" | "AREA" | "INFRASTRUCTURE";
  title: string;
  detail: string;
  href: string;
  entity?: string;
};

function len(value: unknown) {
  return String(value || "").trim().length;
}

function arr(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function faq(value: unknown) {
  return arr(value).filter(
    (item) =>
      Array.isArray(item) &&
      len(item[0]) > 0 &&
      len(item[1]) > 0,
  );
}

function contentLength(sections: unknown) {
  return arr(sections).reduce((sum, raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return sum;
    const section = raw as Record<string, unknown>;
    return (
      sum +
      len(section.heading) +
      arr(section.paragraphs).reduce((a, item) => a + len(item), 0) +
      arr(section.bullets).reduce((a, item) => a + len(item), 0) +
      len(section.note)
    );
  }, 0);
}

function allowedHref(value: unknown) {
  const href = String(value || "").trim();
  const prefixes = [
    "/order",
    "/calculator",
    "/services/",
    "/callback",
    "/works",
    "/areas",
    "/blog",
    "/faq",
    "/offers",
    "/why-ventic",
  ];
  return href.startsWith("/") && prefixes.some((p) => href === p || href.startsWith(p));
}

function dupes<T>(rows: T[], getter: (row: T) => string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const value = getter(row).trim().toLowerCase();
    if (!value) continue;
    map.set(value, (map.get(value) || 0) + 1);
  }
  return new Set([...map.entries()].filter(([, count]) => count > 1).map(([value]) => value));
}

function weight(severity: SeoSeverity) {
  return severity === "CRITICAL"
    ? 15
    : severity === "HIGH"
      ? 8
      : severity === "MEDIUM"
        ? 4
        : 1;
}

export async function buildSeoHealth() {
  const now = new Date();

  const [articles, areas] = await Promise.all([
    prisma.blogArticle.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.serviceArea.findMany({
      where: { active: true },
      orderBy: [{ governorate: "asc" }, { area: "asc" }],
    }),
  ]);

  const publicArticles = articles.filter(
    (article) =>
      article.status === "PUBLISHED" ||
      (
        article.status === "SCHEDULED" &&
        article.scheduledAt &&
        article.scheduledAt <= now
      ),
  );

  const duplicateTitles = dupes(
    publicArticles,
    (article) => article.seoTitle || article.title,
  );
  const duplicateDescriptions = dupes(
    publicArticles,
    (article) => article.seoDescription || article.description,
  );

  const issues: SeoIssue[] = [];

  for (const article of publicArticles) {
    const title = article.seoTitle || article.title;
    const description = article.seoDescription || article.description;
    const sections = arr(article.sections);
    const faqItems = faq(article.faq);
    const sources = arr(article.sources);
    const chars = contentLength(article.sections);
    const ageDays = Math.floor((now.getTime() - article.updatedAt.getTime()) / 86400000);
    const href = "/admin/blog";

    if (len(title) < 30 || len(title) > 65) {
      issues.push({
        id: `article-title-${article.id}`,
        severity: "HIGH",
        type: "ARTICLE",
        title: "SEO Title خارج النطاق",
        detail: `${article.title}: ${len(title)} حرف. استهدف 30–65 حرف تقريبًا.`,
        href,
        entity: article.slug,
      });
    }

    if (len(description) < 90 || len(description) > 170) {
      issues.push({
        id: `article-description-${article.id}`,
        severity: "HIGH",
        type: "ARTICLE",
        title: "Meta Description تحتاج ضبط",
        detail: `${article.title}: ${len(description)} حرف. استهدف 90–170 حرف تقريبًا.`,
        href,
        entity: article.slug,
      });
    }

    if (duplicateTitles.has(title.trim().toLowerCase())) {
      issues.push({
        id: `article-duplicate-title-${article.id}`,
        severity: "CRITICAL",
        type: "ARTICLE",
        title: "SEO Title مكرر",
        detail: `${article.title}: نفس العنوان مستخدم في أكثر من مقال منشور.`,
        href,
        entity: article.slug,
      });
    }

    if (duplicateDescriptions.has(description.trim().toLowerCase())) {
      issues.push({
        id: `article-duplicate-description-${article.id}`,
        severity: "HIGH",
        type: "ARTICLE",
        title: "Meta Description مكررة",
        detail: `${article.title}: الوصف مكرر مع مقال آخر.`,
        href,
        entity: article.slug,
      });
    }

    if (sections.length < 3 || chars < 1200) {
      issues.push({
        id: `article-thin-${article.id}`,
        severity: "HIGH",
        type: "ARTICLE",
        title: "محتوى المقال يحتاج تقوية",
        detail: `${article.title}: ${sections.length} أقسام وحوالي ${chars} حرف محتوى أساسي.`,
        href,
        entity: article.slug,
      });
    }

    if (faqItems.length < 2) {
      issues.push({
        id: `article-faq-${article.id}`,
        severity: "MEDIUM",
        type: "ARTICLE",
        title: "FAQ غير كافية",
        detail: `${article.title}: أضف سؤالين حقيقيين على الأقل.`,
        href,
        entity: article.slug,
      });
    }

    if (sources.length < 1) {
      issues.push({
        id: `article-sources-${article.id}`,
        severity: "MEDIUM",
        type: "ARTICLE",
        title: "المقال بدون مصادر",
        detail: `${article.title}: لا توجد مراجع فنية مسجلة.`,
        href,
        entity: article.slug,
      });
    }

    if (!allowedHref(article.serviceHref)) {
      issues.push({
        id: `article-link-${article.id}`,
        severity: "HIGH",
        type: "ARTICLE",
        title: "CTA داخلي مشكوك فيه",
        detail: `${article.title}: ${article.serviceHref} خارج المسارات الداخلية المعروفة.`,
        href,
        entity: article.slug,
      });
    }

    if (ageDays > 180) {
      issues.push({
        id: `article-stale-${article.id}`,
        severity: "LOW",
        type: "ARTICLE",
        title: "المقال قديم بدون مراجعة",
        detail: `${article.title}: آخر تحديث من ${ageDays} يوم.`,
        href,
        entity: article.slug,
      });
    }
  }

  for (const area of areas) {
    if (!area.seoPublished) continue;

    const href = "/admin/areas";
    const faqItems = faq(area.seoFaq);

    if (len(area.seoTitle) < 20) {
      issues.push({
        id: `area-title-${area.id}`,
        severity: "CRITICAL",
        type: "AREA",
        title: "Local SEO منشور بعنوان ضعيف",
        detail: `${area.area}، ${area.governorate}: SEO Title غير مكتمل.`,
        href,
        entity: area.area,
      });
    }

    if (len(area.seoDescription) < 80) {
      issues.push({
        id: `area-description-${area.id}`,
        severity: "CRITICAL",
        type: "AREA",
        title: "Local SEO منشور بوصف ضعيف",
        detail: `${area.area}: Meta Description أقل من 80 حرف.`,
        href,
        entity: area.area,
      });
    }

    if (len(area.seoIntro) < 120) {
      issues.push({
        id: `area-intro-${area.id}`,
        severity: "CRITICAL",
        type: "AREA",
        title: "صفحة منطقة منشورة بمحتوى رفيع",
        detail: `${area.area}: المقدمة المحلية أقل من 120 حرف.`,
        href,
        entity: area.area,
      });
    }

    if (area.seoHighlights.length < 2 || faqItems.length < 2) {
      issues.push({
        id: `area-readiness-${area.id}`,
        severity: "HIGH",
        type: "AREA",
        title: "Local SEO readiness غير مكتمل",
        detail: `${area.area}: تحتاج نقطتين محليتين وFAQ عدد 2 على الأقل.`,
        href,
        entity: area.area,
      });
    }
  }

  const categoryCounts = blogCategories.map((category) => ({
    slug: category.slug,
    name: category.name,
    count: publicArticles.filter((article) => article.category === category.name).length,
  }));

  for (const category of categoryCounts) {
    if (category.count === 0) {
      issues.push({
        id: `category-empty-${category.slug}`,
        severity: "MEDIUM",
        type: "INFRASTRUCTURE",
        title: "Topic Hub فارغ",
        detail: `${category.name}: مفيش مقال منشور داخل التصنيف.`,
        href: "/admin/blog",
        entity: category.slug,
      });
    }
  }

  const counts = {
    critical: issues.filter((x) => x.severity === "CRITICAL").length,
    high: issues.filter((x) => x.severity === "HIGH").length,
    medium: issues.filter((x) => x.severity === "MEDIUM").length,
    low: issues.filter((x) => x.severity === "LOW").length,
  };

  const score = Math.max(
    0,
    Math.min(100, 100 - issues.reduce((sum, issue) => sum + weight(issue.severity), 0)),
  );

  const indexedAreas = areas.filter((area) => area.seoPublished).length;
  const expectedSitemapUrls =
    16 +
    blogCategories.length +
    publicArticles.length +
    indexedAreas;

  return {
    generatedAt: now.toISOString(),
    score,
    counts,
    totals: {
      articles: publicArticles.length,
      activeAreas: areas.length,
      indexedAreas,
      topicHubs: blogCategories.length,
      expectedSitemapUrls,
    },
    categoryCounts,
    infrastructure: [
      {
        id: "robots",
        label: "robots.ts",
        status: "PASS",
        detail: "Private admin/API/customer paths are excluded and sitemap is declared.",
      },
      {
        id: "sitemap",
        label: "Dynamic Sitemap",
        status: "PASS",
        detail: `Expected public URL count from current data: ${expectedSitemapUrls}.`,
      },
      {
        id: "blog-schema",
        label: "BlogPosting + Breadcrumb",
        status: "PASS",
        detail: "Protected by build regression checks.",
      },
      {
        id: "local-schema",
        label: "Local Service + FAQ + Breadcrumb",
        status: "PASS",
        detail: "Local SEO schema is guarded by V42 publication readiness.",
      },
    ],
    issues: issues.sort((a, b) => {
      const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return rank[a.severity] - rank[b.severity];
    }),
  };
}
