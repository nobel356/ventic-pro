import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

function rangeDays(value: string | null) {
  const parsed = Number(value || 30);
  if (parsed === 7 || parsed === 90) return parsed;
  return 30;
}

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.BLOG_MANAGE);

    const days = rangeDays(
      new URL(request.url).searchParams.get("days"),
    );

    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    );

    const [articles, events, orders] = await Promise.all([
      prisma.blogArticle.findMany({
        where: {
          OR: [
            { status: "PUBLISHED" },
            {
              status: "SCHEDULED",
              scheduledAt: { lte: new Date() },
            },
          ],
        },
        select: {
          slug: true,
          title: true,
          category: true,
          status: true,
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.blogAnalyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        select: {
          articleSlug: true,
          eventType: true,
          sessionHash: true,
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: since },
          acquisitionSource: {
            contains: "medium=blog",
          },
        },
        select: {
          acquisitionSource: true,
          estimatedTotal: true,
          finalTotal: true,
        },
      }),
    ]);

    const rows = articles.map((article) => {
      const own = events.filter(
        (event) => event.articleSlug === article.slug,
      );

      const views = own.filter(
        (event) => event.eventType === "PAGE_VIEW",
      ).length;

      const uniqueSessions = new Set(
        own
          .filter((event) => event.eventType === "PAGE_VIEW")
          .map((event) => event.sessionHash),
      ).size;

      const serviceClicks = own.filter(
        (event) => event.eventType === "SERVICE_CLICK",
      ).length;

      const calculatorClicks = own.filter(
        (event) => event.eventType === "CALCULATOR_CLICK",
      ).length;

      const orderClicks = own.filter(
        (event) => event.eventType === "ORDER_CLICK",
      ).length;

      const relatedClicks = own.filter(
        (event) => event.eventType === "RELATED_CLICK",
      ).length;

      const matchedOrders = orders.filter(
        (order) =>
          Boolean(order.acquisitionSource) &&
          order.acquisitionSource!.includes(
            "campaign=" + article.slug,
          ),
      );

      const orderCount = matchedOrders.length;
      const orderValue = matchedOrders.reduce(
        (sum, order) =>
          sum +
          Number(
            order.finalTotal ??
              order.estimatedTotal ??
              0,
          ),
        0,
      );

      const intentClicks =
        serviceClicks +
        calculatorClicks +
        orderClicks;

      return {
        ...article,
        views,
        uniqueSessions,
        serviceClicks,
        calculatorClicks,
        orderClicks,
        relatedClicks,
        intentClicks,
        orderCount,
        orderValue,
        ctaRate:
          views > 0
            ? Number(
                ((intentClicks / views) * 100).toFixed(1),
              )
            : 0,
        conversionRate:
          uniqueSessions > 0
            ? Number(
                ((orderCount / uniqueSessions) * 100).toFixed(1),
              )
            : 0,
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.views += row.views;
        acc.uniqueSessions += row.uniqueSessions;
        acc.intentClicks += row.intentClicks;
        acc.orderCount += row.orderCount;
        acc.orderValue += row.orderValue;
        return acc;
      },
      {
        views: 0,
        uniqueSessions: 0,
        intentClicks: 0,
        orderCount: 0,
        orderValue: 0,
      },
    );

    return NextResponse.json({
      days,
      since: since.toISOString(),
      totals,
      rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "FAILED" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
