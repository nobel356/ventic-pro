import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
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
import ExecutiveDashboardRefresh from "./ExecutiveDashboardRefresh";

export const dynamic =
  "force-dynamic";

type Severity =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM";

type Decision = {
  id: string;
  severity: Severity;
  title: string;
  count: number;
  detail: string;
  href: string;
  value?: string;
};

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

function money(
  value: unknown,
) {
  return Number(
    value || 0,
  ).toLocaleString("ar-EG", {
    maximumFractionDigits: 0,
  });
}

function attributionKey(
  source: string,
  campaign: string,
) {
  return `${source
    .trim()
    .toLowerCase()}::${campaign
    .trim()
    .toLowerCase()}`;
}

function severityRank(
  severity: Severity,
) {
  return severity ===
    "CRITICAL"
    ? 0
    : severity === "HIGH"
      ? 1
      : 2;
}

export default async function AdminHome() {
  const user =
    await currentUser();

  if (!user) {
    return null;
  }

  const now =
    new Date();
  const today =
    cairoDateKey(now);
  const staleCutoff =
    new Date(
      now.getTime() -
        30 * 60 * 1000,
    );
  const since7 =
    new Date(
      now.getTime() -
        7 *
          24 *
          60 *
          60 *
          1000,
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

  const canViewOrders =
    can(
      user.role,
      PERMISSIONS.ORDERS_VIEW,
      user.permissions,
    );
  const canAssign =
    can(
      user.role,
      PERMISSIONS.ASSIGN_TECH,
      user.permissions,
    );
  const canViewAccounting =
    can(
      user.role,
      PERMISSIONS.ACCOUNTING_VIEW,
      user.permissions,
    );
  const canViewAftercare =
    can(
      user.role,
      PERMISSIONS.AFTERCARE_VIEW,
      user.permissions,
    );
  const canViewInventory =
    can(
      user.role,
      PERMISSIONS.INVENTORY_VIEW,
      user.permissions,
    );
  const canStocktake =
    can(
      user.role,
      PERMISSIONS.STOCKTAKE_MANAGE,
      user.permissions,
    );
  const canManageLeads =
    can(
      user.role,
      PERMISSIONS.LEADS_MANAGE,
      user.permissions,
    );
  const canViewReports =
    can(
      user.role,
      PERMISSIONS.REPORTS_VIEW,
      user.permissions,
    );
  const canViewCost =
    can(
      user.role,
      PERMISSIONS.INVENTORY_COST_VIEW,
      user.permissions,
    );
  const canViewProfitability =
    canViewReports &&
    canViewCost;
  const isSuperAdmin =
    user.role ===
    "SUPER_ADMIN";

  const [
    activeOrders,
    newOrders,
    todayOrders,
    unassignedOrders,
    staleOrders,
    dueInvoices,
    dueAgg,
    openComplaints,
    openMaintenance,
    lowStockRaw,
    followupsDue,
    abandonedLeads,
    draftStocktakes,
    sentEstimates,
    failedMessages,
    unreadAdminNotifications,
    upcomingSlots,
  ] = await Promise.all([
    canViewOrders
      ? prisma.order.count({
          where: {
            status: {
              notIn: [
                "COMPLETED",
                "CANCELLED",
              ],
            },
          },
        })
      : Promise.resolve(0),
    canViewOrders
      ? prisma.order.count({
          where: {
            status: "NEW",
          },
        })
      : Promise.resolve(0),
    canViewOrders
      ? prisma.order.count({
          where: {
            preferredDate:
              today,
            status: {
              not:
                "CANCELLED",
            },
          },
        })
      : Promise.resolve(0),
    canAssign
      ? prisma.order.count({
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
        })
      : Promise.resolve(0),
    canViewOrders
      ? prisma.order.count({
          where: {
            status: "NEW",
            createdAt: {
              lte:
                staleCutoff,
            },
          },
        })
      : Promise.resolve(0),
    canViewAccounting
      ? prisma.invoice.count({
          where: {
            due: {
              gt: 0,
            },
          },
        })
      : Promise.resolve(0),
    canViewAccounting
      ? prisma.invoice.aggregate({
          _sum: {
            due: true,
          },
        })
      : Promise.resolve({
          _sum: {
            due: null,
          },
        }),
    canViewAftercare
      ? prisma.complaint.count({
          where: {
            status: {
              in: [
                "OPEN",
                "SCHEDULED",
                "IN_PROGRESS",
              ],
            },
          },
        })
      : Promise.resolve(0),
    canViewAftercare
      ? prisma.maintenanceRequest.count({
          where: {
            status: {
              in: [
                "OPEN",
                "SCHEDULED",
                "IN_PROGRESS",
              ],
            },
          },
        })
      : Promise.resolve(0),
    canViewInventory
      ? prisma.inventoryItem.findMany({
          where: {
            active: true,
          },
          select: {
            quantity: true,
            reorderLevel:
              true,
          },
        })
      : Promise.resolve([]),
    canManageLeads
      ? prisma.lead.count({
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
        })
      : Promise.resolve(0),
    canManageLeads
      ? prisma.lead.count({
          where: {
            status: {
              in: [
                "STARTED",
                "ABANDONED",
              ],
            },
            consentToFollowUp:
              true,
          },
        })
      : Promise.resolve(0),
    canStocktake
      ? prisma.stocktake.count({
          where: {
            status: "DRAFT",
          },
        })
      : Promise.resolve(0),
    canViewOrders
      ? prisma.venticEstimate.count({
          where: {
            status: "SENT",
          },
        })
      : Promise.resolve(0),
    isSuperAdmin
      ? prisma.notification.count({
          where: {
            status: "FAILED",
            createdAt: {
              gte: since7,
            },
          },
        })
      : Promise.resolve(0),
    prisma.adminNotification.count({
      where: {
        recipientId:
          user.id,
        isRead: false,
      },
    }),
    canViewOrders
      ? prisma.technicianSlot.findMany({
          where: {
            startsAt: {
              gte: now,
            },
          },
          include: {
            technician: {
              select: {
                name: true,
              },
            },
            order: {
              select: {
                id: true,
                orderNo: true,
                customer: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            startsAt: "asc",
          },
          take: 6,
        })
      : Promise.resolve([]),
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

  let negativeOrders = 0;
  let worstNegative:
    | {
        id: string;
        orderNo: string;
        contribution: number;
      }
    | null = null;
  let unallocatedAdSpend = 0;
  let weakCampaigns = 0;
  let worstCampaign:
    | {
        name: string;
        roas: number;
      }
    | null = null;

  if (
    canViewReports ||
    canViewProfitability
  ) {
    const [
      marketingOrders,
      spendLogs,
      orderCostLogs,
    ] = await Promise.all([
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
              paid: true,
            },
          },
          ...(canViewProfitability
            ? {
                inventoryMovements:
                  {
                    select: {
                      type: true,
                      quantity:
                        true,
                      note: true,
                      item: {
                        select: {
                          averageUnitCost:
                            true,
                        },
                      },
                    },
                  },
              }
            : {}),
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
        orderBy: {
          createdAt: "asc",
        },
      }),
      canViewProfitability
        ? prisma.auditLog.findMany({
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
              actorLabel:
                true,
              newValue: true,
              createdAt:
                true,
            },
            orderBy: {
              createdAt:
                "asc",
            },
          })
        : Promise.resolve([]),
    ]);

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

    const orderAttribution =
      new Map(
        marketingOrders.map(
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
        marketingOrders.filter(
          (order) => {
            const attr =
              orderAttribution.get(
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

      if (
        eligible.length === 0
      ) {
        unallocatedAdSpend +=
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

    const campaignSpend =
      new Map<
        string,
        {
          name: string;
          spend: number;
          revenue: number;
          orders: number;
        }
      >();

    for (const spend of spends) {
      if (!spend.campaign) {
        continue;
      }

      const key =
        attributionKey(
          spend.source,
          spend.campaign,
        );
      const row =
        campaignSpend.get(
          key,
        ) || {
          name:
            `${spend.source} / ${spend.campaign}`,
          spend: 0,
          revenue: 0,
          orders: 0,
        };

      row.spend +=
        spend.amount;
      campaignSpend.set(
        key,
        row,
      );
    }

    for (const order of marketingOrders) {
      const attr =
        orderAttribution.get(
          order.id,
        );

      if (
        !attr?.campaign
      ) {
        continue;
      }

      const key =
        attributionKey(
          attr.source,
          attr.campaign,
        );
      const row =
        campaignSpend.get(
          key,
        );

      if (!row) {
        continue;
      }

      row.orders += 1;
      row.revenue +=
        moneyNumber(
          order.invoice
            ?.total,
        ) ||
        moneyNumber(
          order.finalTotal,
        ) ||
        moneyNumber(
          order.estimatedTotal,
        );
    }

    const weak =
      [...campaignSpend.values()]
        .filter(
          (item) =>
            item.spend > 0 &&
            item.orders > 0 &&
            item.revenue /
              item.spend <
              1,
        )
        .sort(
          (a, b) =>
            a.revenue /
              a.spend -
            b.revenue /
              b.spend,
        );

    weakCampaigns =
      weak.length;

    if (weak[0]) {
      worstCampaign = {
        name: weak[0].name,
        roas:
          weak[0].revenue /
          weak[0].spend,
      };
    }

    if (canViewProfitability) {
      const manualCosts =
        materializeOrderCosts(
          orderCostLogs,
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

      const negative =
        marketingOrders
          .filter(
            (order) =>
              order.status ===
              "COMPLETED",
          )
          .map((order) => {
            const revenue =
              moneyNumber(
                order.invoice
                  ?.total,
              ) ||
              moneyNumber(
                order.finalTotal,
              ) ||
              moneyNumber(
                order.estimatedTotal,
              );

            const movements =
              "inventoryMovements" in
                order &&
              Array.isArray(
                order.inventoryMovements,
              )
                ? order.inventoryMovements
                : [];

            const materialCost =
              movements
                .filter(
                  (
                    movement: any,
                  ) => {
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
                    sum: number,
                    movement: any,
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
              materialCost +
              (manualMap.get(
                order.id,
              ) || 0) +
              (adAllocation.get(
                order.id,
              ) || 0);

            return {
              id: order.id,
              orderNo:
                order.orderNo,
              contribution:
                revenue -
                knownCost,
            };
          })
          .filter(
            (item) =>
              item.contribution <
              0,
          )
          .sort(
            (a, b) =>
              a.contribution -
              b.contribution,
          );

      negativeOrders =
        negative.length;
      worstNegative =
        negative[0] ||
        null;
    }
  }

  const decisions: Decision[] =
    [];

  if (
    canViewProfitability &&
    negativeOrders > 0
  ) {
    decisions.push({
      id: "negative-profit",
      severity:
        "CRITICAL",
      title:
        "طلبات بهامش مساهمة سلبي",
      count:
        negativeOrders,
      href:
        "/admin/profitability?period=30",
      detail:
        worstNegative
          ? `أسوأ حالة ${worstNegative.orderNo} بهامش ${money(
              worstNegative.contribution,
            )} ج.`
          : "راجع تكلفة الخامات والإعلان والتشغيل المباشر.",
      value:
        "راجع الربحية",
    });
  }

  if (
    isSuperAdmin &&
    failedMessages > 0
  ) {
    decisions.push({
      id: "failed-messages",
      severity:
        "CRITICAL",
      title:
        "رسائل عملاء فشلت",
      count:
        failedMessages,
      href:
        "/admin/system-health",
      detail:
        "فشل إرسال خلال آخر 7 أيام. راجع Resend/القنوات والـLogs الآمنة.",
      value:
        "آخر 7 أيام",
    });
  }

  if (
    canViewAccounting &&
    dueInvoices > 0
  ) {
    decisions.push({
      id: "collections",
      severity: "HIGH",
      title:
        "تحصيلات مستحقة",
      count:
        dueInvoices,
      href:
        "/admin/accounting",
      detail:
        `${money(
          dueAgg._sum.due,
        )} ج إجمالي متبقي على الفواتير.`,
      value:
        "تحصيل",
    });
  }

  if (
    canViewOrders &&
    staleOrders > 0
  ) {
    decisions.push({
      id: "stale-orders",
      severity: "HIGH",
      title:
        "طلبات جديدة متأخرة",
      count:
        staleOrders,
      href:
        "/admin/orders",
      detail:
        "مر عليها أكثر من 30 دقيقة وما زالت NEW.",
    });
  }

  if (
    canAssign &&
    unassignedOrders > 0
  ) {
    decisions.push({
      id:
        "unassigned-orders",
      severity: "HIGH",
      title:
        "طلبات بدون فني",
      count:
        unassignedOrders,
      href:
        "/admin/orders",
      detail:
        "طلبات جديدة أو مؤكدة تحتاج تعيين فني.",
    });
  }

  if (
    canViewAftercare &&
    openComplaints > 0
  ) {
    decisions.push({
      id: "complaints",
      severity: "HIGH",
      title:
        "شكاوى مفتوحة",
      count:
        openComplaints,
      href:
        "/admin/aftercare",
      detail:
        "تحتاج متابعة أو جدولة أو إغلاق.",
    });
  }

  if (
    canViewInventory &&
    lowStock > 0
  ) {
    decisions.push({
      id: "low-stock",
      severity: "HIGH",
      title:
        "مخزون تحت حد إعادة الطلب",
      count:
        lowStock,
      href:
        "/admin/inventory",
      detail:
        "راجع الكميات والتوريد قبل تأثيرها على التنفيذ.",
    });
  }

  if (
    canViewReports &&
    weakCampaigns > 0
  ) {
    decisions.push({
      id:
        "weak-campaigns",
      severity: "HIGH",
      title:
        "حملات ROAS أقل من 1x",
      count:
        weakCampaigns,
      href:
        "/admin/marketing-analytics?period=30",
      detail:
        worstCampaign
          ? `${worstCampaign.name} عند ${worstCampaign.roas.toFixed(
              2,
            )}x.`
          : "راجع الإنفاق والحملات.",
    });
  }

  if (
    isSuperAdmin &&
    unallocatedAdSpend > 0
  ) {
    decisions.push({
      id:
        "unallocated-spend",
      severity: "MEDIUM",
      title:
        "تكلفة إعلان غير موزعة",
      count: 1,
      href:
        "/admin/marketing-spend",
      detail:
        `${money(
          unallocatedAdSpend,
        )} ج بدون Orders مطابقة للمصدر/الحملة في آخر 30 يوم.`,
      value:
        "راجع UTM",
    });
  }

  if (
    canManageLeads &&
    followupsDue > 0
  ) {
    decisions.push({
      id:
        "lead-followups",
      severity:
        "MEDIUM",
      title:
        "متابعات Leads مستحقة",
      count:
        followupsDue,
      href:
        "/admin/leads",
      detail:
        `${abandonedLeads} Lead غير مكتمل وافق على المتابعة.`,
    });
  }

  if (
    canViewAftercare &&
    openMaintenance > 0
  ) {
    decisions.push({
      id: "maintenance",
      severity:
        "MEDIUM",
      title:
        "صيانة مفتوحة",
      count:
        openMaintenance,
      href:
        "/admin/aftercare",
      detail:
        "طلبات صيانة لم تُغلق بعد.",
    });
  }

  if (
    canStocktake &&
    draftStocktakes > 0
  ) {
    decisions.push({
      id:
        "stocktakes",
      severity:
        "MEDIUM",
      title:
        "جلسات جرد Draft",
      count:
        draftStocktakes,
      href:
        "/admin/inventory/stocktakes",
      detail:
        "راجع الفعلي واعتمد الجرد عند اكتماله.",
    });
  }

  if (
    canViewOrders &&
    sentEstimates > 0
  ) {
    decisions.push({
      id: "estimates",
      severity:
        "MEDIUM",
      title:
        "مقايسات تنتظر رد العميل",
      count:
        sentEstimates,
      href:
        "/admin/orders",
      detail:
        "مقايسات Ventic Pro مرسلة ولم يصل قرار العميل بعد.",
    });
  }

  decisions.sort(
    (a, b) =>
      severityRank(
        a.severity,
      ) -
        severityRank(
          b.severity,
        ) ||
      b.count -
        a.count,
  );

  const criticalCount =
    decisions.filter(
      (item) =>
        item.severity ===
        "CRITICAL",
    ).length;
  const highCount =
    decisions.filter(
      (item) =>
        item.severity ===
        "HIGH",
    ).length;

  const health =
    criticalCount > 0
      ? {
          label:
            "يحتاج تدخل الآن",
          background:
            "#fef2f2",
          border:
            "#fecaca",
          color:
            "#991b1b",
          icon: "🔴",
        }
      : highCount > 0
        ? {
            label:
              "فيه أولويات اليوم",
            background:
              "#fff7ed",
            border:
              "#fed7aa",
            color:
              "#9a3412",
            icon: "🟠",
          }
        : {
            label:
              "التشغيل مستقر",
            background:
              "#f0fdf4",
            border:
              "#bbf7d0",
            color:
              "#166534",
            icon: "🟢",
          };

  const quickLinks = [
    canViewOrders && {
      href:
        "/admin/orders",
      label: "الطلبات",
      icon: "📋",
    },
    canViewAccounting && {
      href:
        "/admin/accounting",
      label: "الحسابات",
      icon: "🧾",
    },
    canViewProfitability && {
      href:
        "/admin/profitability",
      label:
        "ربحية الطلبات",
      icon: "💹",
    },
    canViewInventory && {
      href:
        "/admin/inventory",
      label: "المخزون",
      icon: "📦",
    },
    canViewAftercare && {
      href:
        "/admin/aftercare",
      label:
        "ما بعد التركيب",
      icon: "🛠️",
    },
    canManageLeads && {
      href:
        "/admin/leads",
      label:
        "متابعة Leads",
      icon: "🕓",
    },
    canViewReports && {
      href:
        "/admin/marketing-analytics",
      label:
        "تحليلات التسويق",
      icon: "📈",
    },
    canViewReports && {
      href:
        "/admin/reports",
      label: "التقارير",
      icon: "📊",
    },
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    icon: string;
  }>;

  return (
    <main
      className="admin"
      dir="rtl"
    >
      <section
        style={{
          maxWidth: 1500,
          margin: "0 auto",
          padding:
            "26px 18px 70px",
        }}
      >
        <div style={headStyle}>
          <div>
            <h1
              style={{
                marginBottom: 6,
              }}
            >
              Executive Control Center
            </h1>
            <p
              style={{
                color: "#64748b",
                marginTop: 0,
                lineHeight: 1.7,
              }}
            >
              أهلاً {user.name}. الأولويات والقرارات اليومية في شاشة واحدة، حسب صلاحيات حسابك.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              justifyItems: "end",
            }}
          >
            {can(
              user.role,
              PERMISSIONS.GLOBAL_SEARCH,
              user.permissions,
            ) && (
              <Link
                href="/admin/search"
                style={
                  primaryLinkStyle
                }
              >
                🔎 بحث شامل
              </Link>
            )}

            <ExecutiveDashboardRefresh
              generatedAt={now.toISOString()}
            />
          </div>
        </div>

        <section
          style={{
            marginTop: 20,
            background:
              health.background,
            border:
              `1px solid ${health.border}`,
            borderRadius: 18,
            padding: 18,
            color: health.color,
            display: "flex",
            justifyContent:
              "space-between",
            gap: 16,
            alignItems:
              "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong
              style={{
                display: "block",
                fontSize: 21,
              }}
            >
              {health.icon}{" "}
              {health.label}
            </strong>
            <span
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {criticalCount} حرجة ·{" "}
              {highCount} عالية ·{" "}
              {
                decisions.filter(
                  (item) =>
                    item.severity ===
                    "MEDIUM",
                ).length
              }{" "}
              متابعة
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <MiniMetric
              label="إشعارات غير مقروءة"
              value={
                unreadAdminNotifications
              }
            />
            {canViewOrders && (
              <MiniMetric
                label="مواعيد اليوم"
                value={
                  todayOrders
                }
              />
            )}
          </div>
        </section>

        <div style={statsStyle}>
          {canViewOrders && (
            <>
              <Stat
                label="طلبات نشطة"
                value={
                  activeOrders
                }
              />
              <Stat
                label="طلبات جديدة"
                value={
                  newOrders
                }
                danger={
                  staleOrders >
                  0
                }
              />
              <Stat
                label="مواعيد اليوم"
                value={
                  todayOrders
                }
              />
            </>
          )}

          {canViewAccounting && (
            <Stat
              label="إجمالي المتبقي"
              value={`${money(
                dueAgg._sum.due,
              )} ج`}
              danger={
                Number(
                  dueAgg._sum
                    .due || 0,
                ) > 0
              }
            />
          )}

          {canViewProfitability && (
            <Stat
              label="طلبات هامشها سلبي"
              value={
                negativeOrders
              }
              danger={
                negativeOrders >
                0
              }
              meta="طلبات مكتملة — آخر 30 يوم"
            />
          )}

          {canViewReports && (
            <Stat
              label="حملات ROAS < 1x"
              value={
                weakCampaigns
              }
              danger={
                weakCampaigns >
                0
              }
              meta="آخر 30 يوم"
            />
          )}
        </div>

        <section
          style={{
            marginTop: 24,
          }}
        >
          <div style={sectionHead}>
            <div>
              <h2
                style={{
                  margin: 0,
                }}
              >
                ماذا يحتاج قرارك الآن؟
              </h2>
              <p style={mutedStyle}>
                مرتبة تلقائيًا: حرجة ← عالية ← متابعة.
              </p>
            </div>

            <span
              style={{
                color: "#64748b",
                fontWeight: 800,
              }}
            >
              {decisions.length} بند
            </span>
          </div>

          {decisions.length ===
          0 ? (
            <div style={allClearStyle}>
              <strong>
                ✓ لا توجد أولويات مفتوحة من المؤشرات الحالية.
              </strong>
              <span>
                استمر في متابعة المواعيد والإشعارات الجديدة.
              </span>
            </div>
          ) : (
            <div style={decisionGrid}>
              {decisions.map(
                (decision) => (
                  <DecisionCard
                    key={
                      decision.id
                    }
                    item={
                      decision
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>

        <div style={twoColStyle}>
          {canViewOrders && (
            <section style={panelStyle}>
              <div style={sectionHead}>
                <div>
                  <h2
                    style={{
                      margin: 0,
                    }}
                  >
                    أقرب المواعيد
                  </h2>
                  <p style={mutedStyle}>
                    من جدول الفنيين نفسه.
                  </p>
                </div>
                <Link href="/admin/schedule">
                  فتح التقويم
                </Link>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {upcomingSlots.length ===
                0 ? (
                  <p>
                    لا توجد مواعيد قادمة.
                  </p>
                ) : (
                  upcomingSlots.map(
                    (slot) => (
                      <Link
                        key={
                          slot.id
                        }
                        href={
                          slot.orderId
                            ? `/admin/orders/${slot.orderId}`
                            : "/admin/schedule"
                        }
                        style={rowStyle}
                      >
                        <div>
                          <strong>
                            {
                              slot
                                .technician
                                .name
                            }
                          </strong>
                          <small
                            style={{
                              display:
                                "block",
                              color:
                                "#64748b",
                            }}
                          >
                            {slot.order
                              ? `${slot.order.orderNo} — ${slot.order.customer.name}`
                              : slot.sourceType ||
                                "موعد"}
                          </small>
                        </div>
                        <b>
                          {slot.startsAt.toLocaleString(
                            "ar-EG",
                            {
                              timeZone:
                                "Africa/Cairo",
                              dateStyle:
                                "short",
                              timeStyle:
                                "short",
                            },
                          )}
                        </b>
                      </Link>
                    ),
                  )
                )}
              </div>
            </section>
          )}

          <section style={panelStyle}>
            <h2
              style={{
                marginTop: 0,
              }}
            >
              انتقال سريع
            </h2>
            <p style={mutedStyle}>
              يظهر لك فقط ما تسمح به صلاحياتك.
            </p>

            <div style={quickGridStyle}>
              {quickLinks.map(
                (item) => (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    style={
                      quickStyle
                    }
                  >
                    <span
                      style={{
                        fontSize: 20,
                      }}
                    >
                      {
                        item.icon
                      }
                    </span>
                    <span>
                      {
                        item.label
                      }
                    </span>
                  </Link>
                ),
              )}
            </div>
          </section>
        </div>

        <section style={infoStyle}>
          <strong>
            طريقة قراءة المركز
          </strong>
          <div>
            المؤشرات المالية هنا تعتمد على بيانات Ventic Pro المسجلة. «الهامش السلبي» يستخدم نفس منهج V12I: قيمة الطلب ناقص الخامات التقديرية والإعلان الموزع والتكاليف التشغيلية المباشرة المسجلة، وليس صافي ربح محاسبي. المركز يحدث نفسه كل دقيقة أثناء فتح الصفحة.
          </div>
        </section>
      </section>
    </main>
  );
}

function DecisionCard({
  item,
}: {
  item: Decision;
}) {
  const tone =
    item.severity ===
    "CRITICAL"
      ? {
          label: "حرج",
          background:
            "#fff7f7",
          border:
            "#fecaca",
          color:
            "#991b1b",
        }
      : item.severity ===
          "HIGH"
        ? {
            label: "عالي",
            background:
              "#fff7ed",
            border:
              "#fed7aa",
            color:
              "#9a3412",
          }
        : {
            label: "متابعة",
            background:
              "#f8fafc",
            border:
              "#cbd5e1",
            color:
              "#475569",
          };

  return (
    <Link
      href={item.href}
      style={{
        textDecoration:
          "none",
        color: "inherit",
        border:
          `1px solid ${tone.border}`,
        background:
          tone.background,
        borderRadius: 16,
        padding: 16,
        display: "grid",
        gap: 9,
      }}
    >
      <div style={actionHeadStyle}>
        <span
          style={{
            color: tone.color,
            fontSize: 12,
            fontWeight: 900,
            border:
              `1px solid ${tone.border}`,
            borderRadius: 999,
            padding:
              "4px 8px",
            background: "white",
          }}
        >
          {tone.label}
        </span>

        <b
          style={{
            color: tone.color,
            fontSize: 25,
          }}
        >
          {item.count}
        </b>
      </div>

      <strong
        style={{
          color: "#0f2d4a",
        }}
      >
        {item.title}
      </strong>

      <small
        style={{
          color: "#64748b",
          lineHeight: 1.7,
        }}
      >
        {item.detail}
      </small>

      <span
        style={{
          color: "#075985",
          fontWeight: 900,
          fontSize: 13,
        }}
      >
        {item.value ||
          "فتح ومعالجة"}{" "}
        ←
      </span>
    </Link>
  );
}

function Stat({
  label,
  value,
  danger = false,
  meta,
}: {
  label: string;
  value:
    | string
    | number;
  danger?: boolean;
  meta?: string;
}) {
  return (
    <div style={statStyle}>
      <b
        style={{
          fontSize: 24,
          color: danger
            ? "#b91c1c"
            : "#0f2d4a",
        }}
      >
        {value}
      </b>
      <span
        style={{
          color: "#64748b",
        }}
      >
        {label}
      </span>
      {meta && (
        <small
          style={{
            color: "#94a3b8",
          }}
        >
          {meta}
        </small>
      )}
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div>
      <b
        style={{
          display: "block",
          fontSize: 20,
        }}
      >
        {value}
      </b>
      <small>
        {label}
      </small>
    </div>
  );
}

const headStyle: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const sectionHead: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const statsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(175px,1fr))",
  gap: 10,
  marginTop: 18,
};

const statStyle: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 15,
  padding: 16,
  display: "grid",
  gap: 4,
};

const decisionGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(250px,1fr))",
  gap: 12,
  marginTop: 14,
};

const actionHeadStyle: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 10,
  alignItems: "center",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(340px,1fr))",
  gap: 16,
  marginTop: 24,
};

const panelStyle: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 17,
  padding: 18,
};

const rowStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  display: "flex",
  justifyContent:
    "space-between",
  gap: 10,
  border:
    "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "#f8fafc",
};

const quickGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(140px,1fr))",
  gap: 8,
};

const quickStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#0f2d4a",
  border:
    "1px solid #cbd5e1",
  borderRadius: 10,
  padding: 11,
  textAlign: "center",
  fontWeight: 800,
  background: "#f8fafc",
  display: "grid",
  gap: 5,
};

const primaryLinkStyle: React.CSSProperties = {
  minHeight: 42,
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 10,
  padding: "0 14px",
  color: "white",
  background: "#0f2d4a",
  textDecoration: "none",
  fontWeight: 900,
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  marginBottom: 0,
};

const allClearStyle: React.CSSProperties = {
  marginTop: 14,
  background: "#f0fdf4",
  border:
    "1px solid #bbf7d0",
  borderRadius: 15,
  padding: 17,
  color: "#166534",
  display: "grid",
  gap: 4,
};

const infoStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 15,
  background: "#eff6ff",
  border:
    "1px solid #bfdbfe",
  borderRadius: 14,
  color: "#1e3a8a",
  lineHeight: 1.8,
};
