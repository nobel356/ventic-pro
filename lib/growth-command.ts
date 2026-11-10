import { prisma } from "@/lib/prisma";
import { buildSeoHealth } from "@/lib/seo-health";
import { buildContentGrowthOpportunities } from "@/lib/content-growth";
import { summarizeExperiment } from "@/lib/cro-experiments";

export type GrowthAction = {
  id: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  href: string;
  label: string;
};

function pct(value: number, total: number) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

function priorityRank(value: GrowthAction["priority"]) {
  return {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  }[value];
}

export async function buildGrowthCommandCenter() {
  const now = new Date();
  const since = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  );

  const [
    seo,
    growth,
    orders,
    leads,
    seoActions,
    experiments,
  ] = await Promise.all([
    buildSeoHealth(),
    buildContentGrowthOpportunities(30),
    prisma.order.findMany({
      where: {
        createdAt: { gte: since },
      },
      select: {
        id: true,
        status: true,
        acquisitionSource: true,
        attributionSource: true,
        finalTotal: true,
        estimatedTotal: true,
        invoice: {
          select: {
            total: true,
            paid: true,
          },
        },
      },
    }),
    prisma.lead.findMany({
      where: {
        createdAt: { gte: since },
      },
      select: {
        id: true,
        status: true,
        source: true,
        attributionSource: true,
        convertedOrderId: true,
      },
    }),
    prisma.seoActionState.findMany({
      where: {
        status: {
          not: "RESOLVED",
        },
      },
      select: {
        status: true,
        dueAt: true,
      },
    }),
    prisma.croExperiment.findMany({
      where: {
        status: {
          in: [
            "RUNNING",
            "STOPPED",
            "ROLLED_OUT",
          ],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const completedOrders =
    orders.filter(
      (order) =>
        order.status === "COMPLETED",
    ).length;

  const revenue =
    orders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.invoice?.total ??
            order.finalTotal ??
            order.estimatedTotal ??
            0,
        ),
      0,
    );

  const paid =
    orders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.invoice?.paid ??
            0,
        ),
      0,
    );

  const convertedLeads =
    leads.filter(
      (lead) =>
        Boolean(
          lead.convertedOrderId,
        ) ||
        lead.status ===
          "CONVERTED",
    ).length;

  const structuredOrders =
    orders.filter(
      (order) =>
        Boolean(
          order.attributionSource,
        ),
    ).length;

  const structuredLeads =
    leads.filter(
      (lead) =>
        Boolean(
          lead.attributionSource,
        ),
    ).length;

  const orderAttributionCoverage =
    pct(
      structuredOrders,
      orders.length,
    );

  const leadAttributionCoverage =
    pct(
      structuredLeads,
      leads.length,
    );

  const overdueSeoActions =
    seoActions.filter(
      (item) =>
        item.dueAt &&
        item.dueAt < now,
    ).length;

  const seoTodo =
    seoActions.filter(
      (item) =>
        item.status === "TODO",
    ).length;

  const seoInProgress =
    seoActions.filter(
      (item) =>
        item.status ===
        "IN_PROGRESS",
    ).length;

  const croRows = [];

  for (const experiment of experiments) {
    const [
      controlExposures,
      controlClicks,
      variantExposures,
      variantClicks,
      controlOrders,
      variantOrders,
    ] =
      await Promise.all([
        prisma.croEvent.count({
          where: {
            experimentId:
              experiment.id,
            variant:
              "CONTROL",
            eventType:
              "EXPOSURE",
          },
        }),
        prisma.croEvent.count({
          where: {
            experimentId:
              experiment.id,
            variant:
              "CONTROL",
            eventType:
              "CLICK",
          },
        }),
        prisma.croEvent.count({
          where: {
            experimentId:
              experiment.id,
            variant:
              "VARIANT",
            eventType:
              "EXPOSURE",
          },
        }),
        prisma.croEvent.count({
          where: {
            experimentId:
              experiment.id,
            variant:
              "VARIANT",
            eventType:
              "CLICK",
          },
        }),
        prisma.order.count({
          where: {
            attributionContent:
              "cro:" +
              experiment.id +
              ":CONTROL",
          },
        }),
        prisma.order.count({
          where: {
            attributionContent:
              "cro:" +
              experiment.id +
              ":VARIANT",
          },
        }),
      ]);

    croRows.push({
      experiment,
      metrics:
        summarizeExperiment({
          controlExposures,
          controlClicks,
          controlOrders,
          variantExposures,
          variantClicks,
          variantOrders,
        }),
    });
  }

  const runningExperiments =
    croRows.filter(
      (row) =>
        row.experiment.status ===
        "RUNNING",
    );

  const stoppedWithWinner =
    croRows.filter(
      (row) =>
        row.experiment.status ===
          "STOPPED" &&
        row.metrics.enoughSample &&
        row.metrics.significant &&
        Boolean(
          row.metrics.winner,
        ),
    );

  const actions: GrowthAction[] = [];

  if (seo.counts.critical > 0) {
    actions.push({
      id: "seo-critical",
      priority: "CRITICAL",
      title:
        "اقفل مشاكل SEO الحرجة قبل نشر محتوى جديد",
      detail:
        `${seo.counts.critical} Critical SEO issue موجودة حاليًا.`,
      href:
        "/admin/seo-actions",
      label:
        "افتح SEO Actions",
    });
  }

  if (
    orderAttributionCoverage < 90 ||
    leadAttributionCoverage < 90
  ) {
    actions.push({
      id:
        "attribution-coverage",
      priority: "HIGH",
      title:
        "جودة Attribution أقل من مستوى القرار",
      detail:
        `Order structured coverage ${orderAttributionCoverage}% وLead coverage ${leadAttributionCoverage}%.`,
      href:
        "/admin/attribution-health",
      label:
        "راجع Attribution",
    });
  }

  if (
    stoppedWithWinner.length > 0
  ) {
    actions.push({
      id:
        "cro-decision",
      priority: "HIGH",
      title:
        "عندك تجربة CRO مؤهلة لقرار",
      detail:
        `${stoppedWithWinner.length} experiment متوقفة ولها Winner مؤهل إحصائيًا.`,
      href:
        "/admin/cro-decisions",
      label:
        "خذ القرار",
    });
  }

  if (overdueSeoActions > 0) {
    actions.push({
      id:
        "seo-overdue",
      priority: "HIGH",
      title:
        "SEO Tasks متأخرة",
      detail:
        `${overdueSeoActions} task تجاوزت موعدها.`,
      href:
        "/admin/seo-actions",
      label:
        "راجع المتأخر",
    });
  }

  const highGrowth =
    growth.opportunities.filter(
      (item) =>
        item.priority === "HIGH",
    );

  if (highGrowth.length > 0) {
    actions.push({
      id:
        "content-growth",
      priority:
        growth.dataReady
          ? "HIGH"
          : "MEDIUM",
      title:
        growth.dataReady
          ? "فيه فرص Growth مدعومة ببيانات"
          : "فيه إشارات Growth أولية",
      detail:
        `${highGrowth.length} فرصة High priority في Content Growth.${growth.dataReady ? "" : " لكن العينة لسه صغيرة."}`,
      href:
        "/admin/content-growth",
      label:
        "راجع الفرص",
    });
  }

  if (
    runningExperiments.length > 0
  ) {
    const readyRunning =
      runningExperiments.filter(
        (row) =>
          row.metrics.enoughSample,
      ).length;

    actions.push({
      id:
        "cro-running",
      priority:
        readyRunning > 0
          ? "MEDIUM"
          : "LOW",
      title:
        "Experiments شغالة",
      detail:
        `${runningExperiments.length} تجربة Running؛ ${readyRunning} وصلت للحد الأدنى للعينة.`,
      href:
        "/admin/cro-experiments",
      label:
        "راجع التجارب",
    });
  }

  if (
    seo.counts.critical === 0 &&
    seo.counts.high === 0 &&
    highGrowth.length === 0 &&
    stoppedWithWinner.length === 0
  ) {
    actions.push({
      id:
        "stable",
      priority: "LOW",
      title:
        "مفيش تدخل عاجل واضح",
      detail:
        "النظام لا يرى مشكلة حرجة أو فرصة Growth عالية الأولوية حاليًا. حافظ على جمع البيانات بدل إضافة Features عشوائية.",
      href:
        "/admin/growth-dashboard",
      label:
        "استمر في المراقبة",
    });
  }

  actions.sort(
    (a, b) =>
      priorityRank(
        a.priority,
      ) -
      priorityRank(
        b.priority,
      ),
  );

  return {
    generatedAt:
      now.toISOString(),
    snapshot: {
      leads: leads.length,
      convertedLeads,
      leadConversion:
        pct(
          convertedLeads,
          leads.length,
        ),
      orders: orders.length,
      completedOrders,
      completionRate:
        pct(
          completedOrders,
          orders.length,
        ),
      revenue,
      paid,
      collectionRate:
        revenue > 0
          ? pct(
              paid,
              revenue,
            )
          : 0,
    },
    quality: {
      seoScore: seo.score,
      seoCritical:
        seo.counts.critical,
      seoHigh:
        seo.counts.high,
      seoTodo,
      seoInProgress,
      overdueSeoActions,
      orderAttributionCoverage,
      leadAttributionCoverage,
    },
    growth: {
      dataReady:
        growth.dataReady,
      opportunities:
        growth.opportunities
          .slice(0, 5),
      highCount:
        highGrowth.length,
    },
    cro: {
      running:
        runningExperiments.length,
      stoppedWithWinner:
        stoppedWithWinner.length,
      totalTracked:
        croRows.length,
    },
    actions:
      actions.slice(0, 6),
  };
}
