import { prisma } from "@/lib/prisma";
import { blogCategories } from "@/lib/blog/categories";

export type GrowthOpportunityType =
  | "CTA"
  | "CONVERSION"
  | "CONTENT_GAP"
  | "WINNER"
  | "LOW_TRACTION";

export type GrowthOpportunity = {
  id: string;
  type: GrowthOpportunityType;
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  recommendation: string;
  href: string;
  slug?: string;
  category?: string;
  evidence: {
    views?: number;
    uniqueSessions?: number;
    intentClicks?: number;
    orderCount?: number;
    ctaRate?: number;
    conversionRate?: number;
  };
  score: number;
};

function round1(value: number) {
  return Number(value.toFixed(1));
}

function priority(score: number) {
  if (score >= 70) return "HIGH" as const;
  if (score >= 40) return "MEDIUM" as const;
  return "LOW" as const;
}

export async function buildContentGrowthOpportunities(
  days = 30,
) {
  const since = new Date(
    Date.now() -
      days * 24 * 60 * 60 * 1000,
  );

  const [articles, events, orders] =
    await Promise.all([
      prisma.blogArticle.findMany({
        where: {
          OR: [
            { status: "PUBLISHED" },
            {
              status: "SCHEDULED",
              scheduledAt: {
                lte: new Date(),
              },
            },
          ],
        },
        select: {
          slug: true,
          title: true,
          category: true,
          createdAt: true,
          publishedAt: true,
          updatedAt: true,
        },
      }),
      prisma.blogAnalyticsEvent.findMany({
        where: {
          createdAt: {
            gte: since,
          },
        },
        select: {
          articleSlug: true,
          eventType: true,
          sessionHash: true,
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: since,
          },
          acquisitionSource: {
            contains:
              "medium=blog",
          },
        },
        select: {
          acquisitionSource:
            true,
        },
      }),
    ]);

  const rows = articles.map(
    (article) => {
      const own = events.filter(
        (event) =>
          event.articleSlug ===
          article.slug,
      );

      const views = own.filter(
        (event) =>
          event.eventType ===
          "PAGE_VIEW",
      ).length;

      const uniqueSessions =
        new Set(
          own
            .filter(
              (event) =>
                event.eventType ===
                "PAGE_VIEW",
            )
            .map(
              (event) =>
                event.sessionHash,
            ),
        ).size;

      const serviceClicks =
        own.filter(
          (event) =>
            event.eventType ===
            "SERVICE_CLICK",
        ).length;

      const calculatorClicks =
        own.filter(
          (event) =>
            event.eventType ===
            "CALCULATOR_CLICK",
        ).length;

      const orderClicks =
        own.filter(
          (event) =>
            event.eventType ===
            "ORDER_CLICK",
        ).length;

      const intentClicks =
        serviceClicks +
        calculatorClicks +
        orderClicks;

      const orderCount =
        orders.filter(
          (order) =>
            Boolean(
              order.acquisitionSource,
            ) &&
            order.acquisitionSource!.includes(
              "campaign=" +
                article.slug,
            ),
        ).length;

      const ctaRate =
        views > 0
          ? round1(
              (intentClicks /
                views) *
                100,
            )
          : 0;

      const conversionRate =
        uniqueSessions > 0
          ? round1(
              (orderCount /
                uniqueSessions) *
                100,
            )
          : 0;

      const ageDays =
        Math.floor(
          (Date.now() -
            (
              article.publishedAt ||
              article.createdAt
            ).getTime()) /
            86400000,
        );

      return {
        ...article,
        views,
        uniqueSessions,
        intentClicks,
        orderCount,
        ctaRate,
        conversionRate,
        ageDays,
      };
    },
  );

  const opportunities:
    GrowthOpportunity[] = [];

  for (const row of rows) {
    if (
      row.uniqueSessions >= 10 &&
      row.ctaRate < 5
    ) {
      const score =
        Math.min(
          100,
          55 +
            Math.min(
              row.uniqueSessions,
              40,
            ),
        );

      opportunities.push({
        id:
          "cta-" +
          row.slug,
        type: "CTA",
        priority:
          priority(score),
        title:
          "Traffic موجود لكن CTA ضعيف",
        detail:
          `${row.title}: ${row.uniqueSessions} unique sessions وCTA rate ${row.ctaRate}%.`,
        recommendation:
          "اختبر CTA أوضح وأقرب للمشكلة داخل منتصف المقال، وليس في نهاية الصفحة فقط.",
        href:
          "/admin/blog",
        slug: row.slug,
        category:
          row.category,
        evidence: {
          views: row.views,
          uniqueSessions:
            row.uniqueSessions,
          intentClicks:
            row.intentClicks,
          orderCount:
            row.orderCount,
          ctaRate:
            row.ctaRate,
          conversionRate:
            row.conversionRate,
        },
        score,
      });
    }

    if (
      row.intentClicks >= 5 &&
      row.orderCount === 0
    ) {
      const score =
        Math.min(
          100,
          65 +
            row.intentClicks * 3,
        );

      opportunities.push({
        id:
          "conversion-" +
          row.slug,
        type:
          "CONVERSION",
        priority:
          priority(score),
        title:
          "نية شراء بدون Orders",
        detail:
          `${row.title}: ${row.intentClicks} CTA clicks بدون طلب منسوب.`,
        recommendation:
          "راجع صفحة الهبوط بعد CTA، وضوح السعر/الثقة، وسلامة Attribution قبل تغيير المقال نفسه.",
        href:
          "/admin/blog/performance",
        slug: row.slug,
        category:
          row.category,
        evidence: {
          views: row.views,
          uniqueSessions:
            row.uniqueSessions,
          intentClicks:
            row.intentClicks,
          orderCount: 0,
          ctaRate:
            row.ctaRate,
          conversionRate: 0,
        },
        score,
      });
    }

    if (
      row.uniqueSessions >= 5 &&
      (
        row.orderCount >= 1 ||
        row.conversionRate >= 2
      )
    ) {
      const score =
        Math.min(
          100,
          60 +
            row.orderCount * 10 +
            Math.round(
              row.conversionRate,
            ),
        );

      opportunities.push({
        id:
          "winner-" +
          row.slug,
        type: "WINNER",
        priority:
          priority(score),
        title:
          "مقال مثبت أنه يساهم في التحويل",
        detail:
          `${row.title}: ${row.orderCount} orders وconversion ${row.conversionRate}%.`,
        recommendation:
          "ابنِ Article Cluster حول نفس intent واربط المقالات الجديدة بهذا المقال بدل نشر موضوعات بعيدة.",
        href:
          "/admin/blog",
        slug: row.slug,
        category:
          row.category,
        evidence: {
          views: row.views,
          uniqueSessions:
            row.uniqueSessions,
          intentClicks:
            row.intentClicks,
          orderCount:
            row.orderCount,
          ctaRate:
            row.ctaRate,
          conversionRate:
            row.conversionRate,
        },
        score,
      });
    }

    if (
      row.ageDays >= 30 &&
      row.views < 5
    ) {
      const score =
        row.views === 0
          ? 50
          : 35;

      opportunities.push({
        id:
          "low-traction-" +
          row.slug,
        type:
          "LOW_TRACTION",
        priority:
          priority(score),
        title:
          "المقال لا يكتسب Traction",
        detail:
          `${row.title}: ${row.views} views خلال ${days} يوم وهو منشور من ${row.ageDays} يوم.`,
        recommendation:
          "لا تضف مقال مشابه الآن. راجع search intent والعنوان والربط الداخلي قبل توسيع نفس الموضوع.",
        href:
          "/admin/seo-health",
        slug: row.slug,
        category:
          row.category,
        evidence: {
          views: row.views,
          uniqueSessions:
            row.uniqueSessions,
          intentClicks:
            row.intentClicks,
          orderCount:
            row.orderCount,
          ctaRate:
            row.ctaRate,
          conversionRate:
            row.conversionRate,
        },
        score,
      });
    }
  }

  const categoryCounts =
    blogCategories.map(
      (category) => ({
        ...category,
        count: rows.filter(
          (row) =>
            row.category ===
            category.name,
        ).length,
      }),
    );

  for (const category of categoryCounts) {
    if (category.count < 2) {
      const score =
        category.count === 0
          ? 75
          : 55;

      opportunities.push({
        id:
          "gap-" +
          category.slug,
        type:
          "CONTENT_GAP",
        priority:
          priority(score),
        title:
          "Topic Hub محتاج محتوى",
        detail:
          `${category.name}: فيه ${category.count} مقال منشور فقط.`,
        recommendation:
          "أضف مقال واحد فقط يغطي search intent مختلف بوضوح، ثم راقب الأداء قبل إضافة المزيد.",
        href:
          "/admin/blog",
        category:
          category.name,
        evidence: {},
        score,
      });
    }
  }

  const totalViews =
    rows.reduce(
      (sum, row) =>
        sum + row.views,
      0,
    );

  const totalUnique =
    rows.reduce(
      (sum, row) =>
        sum +
        row.uniqueSessions,
      0,
    );

  const totalOrders =
    rows.reduce(
      (sum, row) =>
        sum +
        row.orderCount,
      0,
    );

  const dataReady =
    totalUnique >= 20;

  return {
    days,
    since:
      since.toISOString(),
    dataReady,
    sample: {
      articles:
        rows.length,
      views:
        totalViews,
      uniqueSessions:
        totalUnique,
      orders:
        totalOrders,
    },
    categoryCounts,
    opportunities:
      opportunities.sort(
        (a, b) =>
          b.score -
          a.score,
      ),
    message: dataReady
      ? null
      : "الداتا لسه قليلة. التوصيات الظاهرة تعتبر إشارات أولية وليست قرارات نهائية حتى نوصل على الأقل 20 Unique Sessions إجمالًا.",
  };
}
