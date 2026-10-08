import { prisma } from "@/lib/prisma";
import {
  moneyNumber,
  parseAttribution,
} from "@/lib/marketing-analytics";
import {
  MARKETING_SPEND_RECORDED,
  MARKETING_SPEND_VOIDED,
  materializeMarketingSpends,
} from "@/lib/marketing-spend";
import {
  ORDER_COST_RECORDED,
  ORDER_COST_VOIDED,
  materializeOrderCosts,
} from "@/lib/order-costs";
import { parseInventoryNote } from "@/lib/inventory";

function cairoDateKey(
  date = new Date(),
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
}

function money(value: number) {
  return value.toLocaleString(
    "ar-EG",
    {
      maximumFractionDigits: 0,
    },
  );
}

function key(
  source: string,
  campaign: string,
) {
  return `${source
    .trim()
    .toLowerCase()}::${campaign
    .trim()
    .toLowerCase()}`;
}

export type ExecutiveDigest = {
  generatedAt: Date;
  todayOrders: number;
  newOrders: number;
  staleOrders: number;
  unassignedOrders: number;
  dueInvoices: number;
  dueAmount: number;
  complaints: number;
  maintenance: number;
  lowStock: number;
  leadsDue: number;
  failedNotifications24h: number;
  negativeCompletedOrders30d: number;
  weakCampaigns30d: number;
  unallocatedSpend30d: number;
};

export async function getExecutiveDigest(): Promise<ExecutiveDigest> {
  const now =
    new Date();
  const today =
    cairoDateKey(now);
  const staleCutoff =
    new Date(
      now.getTime() -
        30 * 60 * 1000,
    );
  const since24 =
    new Date(
      now.getTime() -
        24 * 60 * 60 * 1000,
    );
  const since30 =
    new Date(
      now.getTime() -
        30 *
          24 *
          60 *
          60 *
          1000,
    );

  const [
    todayOrders,
    newOrders,
    staleOrders,
    unassignedOrders,
    dueInvoices,
    dueAgg,
    complaints,
    maintenance,
    lowStockRaw,
    leadsDue,
    failedNotifications24h,
    orders30,
    spendLogs,
    costLogs,
  ] = await Promise.all([
    prisma.order.count({
      where: {
        preferredDate:
          today,
        status: {
          not:
            "CANCELLED",
        },
      },
    }),
    prisma.order.count({
      where: {
        status: "NEW",
      },
    }),
    prisma.order.count({
      where: {
        status: "NEW",
        createdAt: {
          lte:
            staleCutoff,
        },
      },
    }),
    prisma.order.count({
      where: {
        technicianId:
          null,
        status: {
          in: [
            "NEW",
            "CONFIRMED",
          ],
        },
      },
    }),
    prisma.invoice.count({
      where: {
        due: {
          gt: 0,
        },
      },
    }),
    prisma.invoice.aggregate({
      _sum: {
        due: true,
      },
    }),
    prisma.complaint.count({
      where: {
        status: {
          in: [
            "OPEN",
            "SCHEDULED",
            "IN_PROGRESS",
          ],
        },
      },
    }),
    prisma.maintenanceRequest.count({
      where: {
        status: {
          in: [
            "OPEN",
            "SCHEDULED",
            "IN_PROGRESS",
          ],
        },
      },
    }),
    prisma.inventoryItem.findMany({
      where: {
        active: true,
      },
      select: {
        quantity: true,
        reorderLevel: true,
      },
    }),
    prisma.lead.count({
      where: {
        status: {
          in: [
            "STARTED",
            "CONTACTED",
            "ABANDONED",
          ],
        },
        consentToFollowUp:
          true,
        nextFollowUpAt: {
          lte: now,
        },
      },
    }),
    prisma.notification.count({
      where: {
        status: "FAILED",
        createdAt: {
          gte: since24,
        },
      },
    }),
    prisma.order.findMany({
      where: {
        createdAt: {
          gte: since30,
        },
      },
      select: {
        id: true,
        orderNo: true,
        status: true,
        acquisitionSource:
          true,
        estimatedTotal:
          true,
        finalTotal: true,
        invoice: {
          select: {
            total: true,
          },
        },
        inventoryMovements: {
          select: {
            type: true,
            quantity: true,
            note: true,
            item: {
              select: {
                averageUnitCost:
                  true,
              },
            },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            MARKETING_SPEND_RECORDED,
            MARKETING_SPEND_VOIDED,
          ],
        },
      },
      select: {
        id: true,
        action: true,
        actorLabel: true,
        newValue: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            ORDER_COST_RECORDED,
            ORDER_COST_VOIDED,
          ],
        },
      },
      select: {
        id: true,
        orderId: true,
        action: true,
        actorLabel: true,
        newValue: true,
        createdAt: true,
      },
    }),
  ]);

  const lowStock =
    lowStockRaw.filter(
      (item) =>
        Number(
          item.quantity,
        ) <=
        Number(
          item.reorderLevel,
        ),
    ).length;

  const spends =
    materializeMarketingSpends(
      spendLogs,
    ).filter(
      (item) =>
        item.spentAt >=
          since30 &&
        item.spentAt <=
          now,
    );

  const attrs =
    new Map(
      orders30.map(
        (order) => [
          order.id,
          parseAttribution(
            order.acquisitionSource,
          ),
        ],
      ),
    );

  const adAllocation =
    new Map<
      string,
      number
    >();
  let unallocatedSpend30d =
    0;

  for (const spend of spends) {
    const source =
      spend.source
        .trim()
        .toLowerCase();
    const campaign =
      spend.campaign
        .trim()
        .toLowerCase();

    const eligible =
      orders30.filter(
        (order) => {
          const attr =
            attrs.get(
              order.id,
            );

          if (!attr) {
            return false;
          }

          if (
            attr.source
              .trim()
              .toLowerCase() !==
            source
          ) {
            return false;
          }

          if (
            campaign &&
            attr.campaign
              .trim()
              .toLowerCase() !==
              campaign
          ) {
            return false;
          }

          return true;
        },
      );

    if (!eligible.length) {
      unallocatedSpend30d +=
        spend.amount;
      continue;
    }

    const perOrder =
      spend.amount /
      eligible.length;

    for (const order of eligible) {
      adAllocation.set(
        order.id,
        (adAllocation.get(
          order.id,
        ) || 0) +
          perOrder,
      );
    }
  }

  const manualCosts =
    materializeOrderCosts(
      costLogs,
    );
  const manualMap =
    new Map<
      string,
      number
    >();

  for (const cost of manualCosts) {
    manualMap.set(
      cost.orderId,
      (manualMap.get(
        cost.orderId,
      ) || 0) +
        cost.amount,
    );
  }

  const negativeCompletedOrders30d =
    orders30
      .filter(
        (order) =>
          order.status ===
          "COMPLETED",
      )
      .filter(
        (order) => {
          const revenue =
            moneyNumber(
              order.invoice?.total,
            ) ||
            moneyNumber(
              order.finalTotal,
            ) ||
            moneyNumber(
              order.estimatedTotal,
            );

          const materials =
            order.inventoryMovements
              .filter(
                (movement) => {
                  const parsed =
                    parseInventoryNote(
                      movement.note,
                    );

                  return (
                    movement.type ===
                      "OUT" &&
                    parsed.marker ===
                      "TECH_OUT"
                  );
                },
              )
              .reduce(
                (
                  sum,
                  movement,
                ) =>
                  sum +
                  moneyNumber(
                    movement.quantity,
                  ) *
                    moneyNumber(
                      movement.item
                        .averageUnitCost,
                    ),
                0,
              );

          const knownCost =
            materials +
            (manualMap.get(
              order.id,
            ) || 0) +
            (adAllocation.get(
              order.id,
            ) || 0);

          return (
            revenue -
              knownCost <
            0
          );
        },
      ).length;

  const campaignMap =
    new Map<
      string,
      {
        spend: number;
        revenue: number;
        orders: number;
      }
    >();

  for (const spend of spends) {
    if (!spend.campaign) {
      continue;
    }

    const mapKey =
      key(
        spend.source,
        spend.campaign,
      );
    const row =
      campaignMap.get(
        mapKey,
      ) || {
        spend: 0,
        revenue: 0,
        orders: 0,
      };

    row.spend +=
      spend.amount;
    campaignMap.set(
      mapKey,
      row,
    );
  }

  for (const order of orders30) {
    const attr =
      attrs.get(
        order.id,
      );

    if (!attr?.campaign) {
      continue;
    }

    const mapKey =
      key(
        attr.source,
        attr.campaign,
      );
    const row =
      campaignMap.get(
        mapKey,
      );

    if (!row) {
      continue;
    }

    row.orders += 1;
    row.revenue +=
      moneyNumber(
        order.invoice?.total,
      ) ||
      moneyNumber(
        order.finalTotal,
      ) ||
      moneyNumber(
        order.estimatedTotal,
      );
  }

  const weakCampaigns30d =
    [...campaignMap.values()]
      .filter(
        (item) =>
          item.spend > 0 &&
          item.orders > 0 &&
          item.revenue /
            item.spend <
            1,
      ).length;

  return {
    generatedAt: now,
    todayOrders,
    newOrders,
    staleOrders,
    unassignedOrders,
    dueInvoices,
    dueAmount:
      moneyNumber(
        dueAgg._sum.due,
      ),
    complaints,
    maintenance,
    lowStock,
    leadsDue,
    failedNotifications24h,
    negativeCompletedOrders30d,
    weakCampaigns30d,
    unallocatedSpend30d,
  };
}

export function executiveDigestText(
  digest: ExecutiveDigest,
) {
  const date =
    digest.generatedAt.toLocaleDateString(
      "ar-EG",
      {
        timeZone:
          "Africa/Cairo",
        dateStyle: "full",
      },
    );

  return [
    "Ventic Pro — الملخص التنفيذي اليومي",
    date,
    "",
    `مواعيد اليوم: ${digest.todayOrders}`,
    `طلبات جديدة: ${digest.newOrders}`,
    `طلبات جديدة متأخرة أكثر من 30 دقيقة: ${digest.staleOrders}`,
    `طلبات بدون فني: ${digest.unassignedOrders}`,
    "",
    `فواتير بها متبقي: ${digest.dueInvoices}`,
    `إجمالي المتبقي: ${money(digest.dueAmount)} ج`,
    "",
    `شكاوى مفتوحة: ${digest.complaints}`,
    `صيانة مفتوحة: ${digest.maintenance}`,
    `مخزون تحت الحد: ${digest.lowStock}`,
    `متابعات Leads مستحقة: ${digest.leadsDue}`,
    "",
    `رسائل فاشلة خلال 24 ساعة: ${digest.failedNotifications24h}`,
    `طلبات مكتملة بهامش مساهمة سلبي — 30 يوم: ${digest.negativeCompletedOrders30d}`,
    `حملات ROAS أقل من 1x — 30 يوم: ${digest.weakCampaigns30d}`,
    `إعلان غير موزع — 30 يوم: ${money(digest.unallocatedSpend30d)} ج`,
    "",
    "هذا ملخص تشغيلي وليس تقرير صافي ربح محاسبي.",
  ].join("\n");
}
