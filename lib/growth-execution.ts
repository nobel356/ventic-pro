import { prisma } from "@/lib/prisma";
import { buildSeoHealth } from "@/lib/seo-health";

const INDEXING_KEYS = [
  "growth.indexing.searchConsoleVerified",
  "growth.indexing.sitemapSubmitted",
  "growth.indexing.indexedUrls",
  "growth.indexing.lastCheckedAt",
] as const;

function boolValue(value: unknown) {
  return value === true || value === "true";
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export type GrowthExecutionStage = {
  key: string;
  label: string;
  status:
    | "PASS"
    | "ACTION_REQUIRED"
    | "EVIDENCE_REQUIRED"
    | "WAITING"
    | "COLLECTING"
    | "LOCKED"
    | "READY";
  detail: string;
  href: string;
};

export async function buildGrowthExecutionClosure() {
  const now = new Date();
  const since = new Date(
    now.getTime() -
      30 * 24 * 60 * 60 * 1000,
  );

  const [
    seo,
    publishedArticles,
    activeAreas,
    seoAreas,
    reviewsTotal,
    publicReviews,
    completedOrders,
    portfolioRows,
    pageViews,
    runningCro,
    indexingSettings,
  ] = await Promise.all([
    buildSeoHealth(),
    prisma.blogArticle.count({
      where: {
        OR: [
          { status: "PUBLISHED" },
          {
            status: "SCHEDULED",
            scheduledAt: { lte: now },
          },
        ],
      },
    }),
    prisma.serviceArea.count({
      where: { active: true },
    }),
    prisma.serviceArea.count({
      where: {
        active: true,
        seoPublished: true,
      },
    }),
    prisma.review.count(),
    prisma.review.count({
      where: {
        isPublished: true,
        publicConsent: true,
        overall: { gte: 4 },
      },
    }),
    prisma.order.count({
      where: {
        status: "COMPLETED",
        archivedAt: null,
      },
    }),
    prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*)::bigint AS count
      FROM "PortfolioVideo"
      WHERE "isPublished" = true
        AND "customerConsent" = true
        AND (
          "blobPathname" LIKE 'youtube:%'
          OR "blobPathname" LIKE 'tiktok:%'
        )
    `,
    prisma.blogAnalyticsEvent.findMany({
      where: {
        eventType: "PAGE_VIEW",
        createdAt: { gte: since },
      },
      select: {
        articleSlug: true,
        sessionHash: true,
      },
    }),
    prisma.croExperiment.count({
      where: { status: "RUNNING" },
    }),
    prisma.runtimeSetting.findMany({
      where: {
        key: { in: [...INDEXING_KEYS] },
      },
      select: {
        key: true,
        value: true,
        updatedAt: true,
      },
    }),
  ]);

  const settingMap = new Map(
    indexingSettings.map((item) => [
      item.key,
      item.value,
    ]),
  );

  const searchConsoleVerified =
    boolValue(
      settingMap.get(
        "growth.indexing.searchConsoleVerified",
      ),
    );

  const sitemapSubmitted =
    boolValue(
      settingMap.get(
        "growth.indexing.sitemapSubmitted",
      ),
    );

  const indexedUrls =
    Math.max(
      0,
      Math.floor(
        numberValue(
          settingMap.get(
            "growth.indexing.indexedUrls",
          ),
        ),
      ),
    );

  const lastCheckedAt =
    stringValue(
      settingMap.get(
        "growth.indexing.lastCheckedAt",
      ),
    );

  const totalUnique =
    new Set(
      pageViews.map(
        (event) =>
          event.sessionHash,
      ),
    ).size;

  const byArticle =
    new Map<
      string,
      Set<string>
    >();

  for (const event of pageViews) {
    const set =
      byArticle.get(
        event.articleSlug,
      ) || new Set<string>();

    set.add(
      event.sessionHash,
    );

    byArticle.set(
      event.articleSlug,
      set,
    );
  }

  const maxArticleUnique =
    Math.max(
      0,
      ...Array.from(
        byArticle.values(),
      ).map((set) => set.size),
    );

  const portfolioPublic =
    Number(
      portfolioRows[0]?.count ||
        0,
    );

  const stages:
    GrowthExecutionStage[] =
    [
      {
        key: "technical-seo",
        label:
          "Technical + On-page SEO",
        status:
          seo.counts.critical ===
            0 &&
          seo.counts.high === 0
            ? "PASS"
            : "ACTION_REQUIRED",
        detail:
          seo.counts.critical ===
            0 &&
          seo.counts.high === 0
            ? `SEO Health ${seo.score}/100 بدون Critical/High issues.`
            : `${seo.counts.critical} Critical و${seo.counts.high} High issue تحتاج إغلاق.`,
        href:
          "/admin/seo-actions",
      },
      {
        key: "content-base",
        label:
          "Content Base",
        status:
          publishedArticles >= 12
            ? "PASS"
            : "ACTION_REQUIRED",
        detail:
          `${publishedArticles} مقال منشور/فعال. خط الأساس المستهدف 12 على الأقل.`,
        href:
          "/admin/blog",
      },
      {
        key: "indexing",
        label:
          "Search Indexing Evidence",
        status:
          searchConsoleVerified &&
          sitemapSubmitted &&
          indexedUrls > 0
            ? "PASS"
            : "EVIDENCE_REQUIRED",
        detail:
          searchConsoleVerified &&
          sitemapSubmitted &&
          indexedUrls > 0
            ? `Search Console verified، Sitemap submitted، و${indexedUrls} URL مثبتة Indexed.`
            : "الـrobots/sitemap جاهزين تقنيًا، لكن الإغلاق يحتاج Evidence حقيقية من Search Console بدل التخمين.",
        href:
          "/admin/growth-execution",
      },
      {
        key: "local-seo",
        label:
          "Local SEO",
        status:
          activeAreas === 0
            ? "WAITING"
            : seoAreas > 0
              ? "PASS"
              : "ACTION_REQUIRED",
        detail:
          activeAreas === 0
            ? "لا توجد Service Area حقيقية Active حاليًا؛ لن يتم إنشاء صفحات مناطق وهمية."
            : `${activeAreas} منطقة Active، منها ${seoAreas} منشورة SEO.`,
        href:
          "/admin/areas",
      },
      {
        key: "reviews",
        label:
          "Review Acquisition",
        status:
          completedOrders === 0
            ? "WAITING"
            : publicReviews >= 3
              ? "PASS"
              : "COLLECTING",
        detail:
          completedOrders === 0
            ? "لا توجد Orders مكتملة حاليًا. Review reminder automation جاهزة لأول عميل مكتمل."
            : `${reviewsTotal} Review إجمالي، ${publicReviews} Public consented review.`,
        href:
          "/admin/reviews",
      },
      {
        key: "portfolio",
        label:
          "Portfolio Proof",
        status:
          portfolioPublic >= 3
            ? "PASS"
            : "ACTION_REQUIRED",
        detail:
          `${portfolioPublic} عمل حقيقي منشور بموافقة العميل. Structured data مفعلة من V67.`,
        href:
          "/admin/work-videos",
      },
      {
        key: "analytics",
        label:
          "Traffic + Analytics Data",
        status:
          totalUnique >= 20
            ? "PASS"
            : "COLLECTING",
        detail:
          `${totalUnique} Unique blog sessions خلال 30 يوم. القرارات تصبح معقولة من 20+ إجمالًا.`,
        href:
          "/admin/blog/performance",
      },
      {
        key: "cro",
        label:
          "CRO Activation",
        status:
          maxArticleUnique >= 100
            ? runningCro > 0
              ? "PASS"
              : "READY"
            : "LOCKED",
        detail:
          maxArticleUnique >= 100
            ? `أعلى مقال عنده ${maxArticleUnique} Unique Sessions / 30d. CRO مسموح.`
            : `أعلى مقال عنده ${maxArticleUnique}/100 Unique Sessions المطلوبة قبل Start Experiment.`,
        href:
          "/admin/cro-experiments",
      },
    ];

  const hardActions =
    stages.filter(
      (stage) =>
        stage.status ===
          "ACTION_REQUIRED" ||
        stage.status ===
          "EVIDENCE_REQUIRED",
    ).length;

  const waiting =
    stages.filter(
      (stage) =>
        [
          "WAITING",
          "COLLECTING",
          "LOCKED",
        ].includes(
          stage.status,
        ),
    ).length;

  return {
    implementationStatus:
      "CLOSED" as const,
    executionStatus:
      hardActions > 0
        ? ("ACTION_REQUIRED" as const)
        : waiting > 0
          ? ("ACTIVE_WAITING_REAL_DATA" as const)
          : ("FULLY_ACTIVE" as const),
    generatedAt:
      now.toISOString(),
    stages,
    metrics: {
      seoScore: seo.score,
      publishedArticles,
      activeAreas,
      seoAreas,
      completedOrders,
      reviewsTotal,
      publicReviews,
      portfolioPublic,
      uniqueBlogSessions30d:
        totalUnique,
      maxArticleUnique30d:
        maxArticleUnique,
      runningCro,
    },
    indexing: {
      searchConsoleVerified,
      sitemapSubmitted,
      indexedUrls,
      lastCheckedAt,
      verificationMetaConfigured:
        Boolean(
          process.env
            .NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        ),
      sitemapUrl:
        "https://ventic-pro.com/sitemap.xml",
      robotsUrl:
        "https://ventic-pro.com/robots.txt",
    },
  };
}
