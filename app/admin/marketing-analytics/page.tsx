import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import {
  cairoDayKey,
  moneyNumber,
  parseAttribution,
  percent,
} from "@/lib/marketing-analytics";
import MarketingAnalyticsExport from "./MarketingAnalyticsExport";
import {
  MARKETING_SPEND_RECORDED,
  MARKETING_SPEND_VOIDED,
  materializeMarketingSpends,
} from "@/lib/marketing-spend";

export const dynamic =
  "force-dynamic";

type SearchParams = Promise<{
  period?: string;
}>;

type SourceRow = {
  source: string;
  leads: number;
  convertedLeads: number;
  abandonedLeads: number;
  orders: number;
  completedOrders: number;
  cancelledOrders: number;
  invoicedValue: number;
  paidValue: number;
  recordedOrderValue: number;
  newCustomers: number;
  adSpend: number;
};

type CampaignRow = SourceRow & {
  campaign: string;
  medium: string;
  contentOrders: Record<
    string,
    number
  >;
};

function safePeriod(
  value: string | undefined,
) {
  const parsed = Number(value);

  return [7, 30, 90].includes(
    parsed,
  )
    ? parsed
    : 30;
}

function money(value: number) {
  return value.toLocaleString(
    "ar-EG",
    {
      maximumFractionDigits: 0,
    },
  );
}

function sourceKey(
  source: string,
) {
  return source.trim() ||
    "غير معروف / مباشر";
}

function campaignKey(
  source: string,
  campaign: string,
) {
  return `${source}::${campaign}`;
}

export default async function MarketingAnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user =
    await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    !can(
      user.role,
      PERMISSIONS.REPORTS_VIEW,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  const params =
    await searchParams;
  const periodDays =
    safePeriod(params.period);
  const since = new Date(
    Date.now() -
      periodDays *
        24 *
        60 *
        60 *
        1000,
  );

  const [orders, leads, spendAuditLogs] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: since,
          },
        },
        select: {
          id: true,
          orderNo: true,
          customerId: true,
          status: true,
          acquisitionSource: true,
          estimatedTotal: true,
          finalTotal: true,
          createdAt: true,
          invoice: {
            select: {
              total: true,
              paid: true,
              due: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.lead.findMany({
        where: {
          createdAt: {
            gte: since,
          },
        },
        select: {
          id: true,
          source: true,
          status: true,
          currentStep: true,
          convertedOrderId: true,
          createdAt: true,
          lastActivityAt: true,
        },
        orderBy: {
          createdAt: "asc",
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
    ]);

  const spends =
    materializeMarketingSpends(
      spendAuditLogs,
    ).filter(
      (item) =>
        item.spentAt >= since &&
        item.spentAt <= new Date(),
    );

  const customerIds = [
    ...new Set(
      orders.map(
        (order) =>
          order.customerId,
      ),
    ),
  ];

  const firstOrderRows =
    customerIds.length
      ? await prisma.order.groupBy({
          by: ["customerId"],
          where: {
            customerId: {
              in: customerIds,
            },
          },
          _min: {
            createdAt: true,
          },
        })
      : [];

  const newCustomerIds =
    new Set(
      firstOrderRows
        .filter(
          (row) =>
            row._min.createdAt &&
            row._min.createdAt >=
              since,
        )
        .map(
          (row) =>
            row.customerId,
        ),
    );

  const countedNewCustomers =
    new Set<string>();

  const sourceMap =
    new Map<string, SourceRow>();
  const campaignMap =
    new Map<string, CampaignRow>();

  function ensureSource(
    source: string,
  ) {
    const key =
      sourceKey(source);
    const existing =
      sourceMap.get(key);

    if (existing) {
      return existing;
    }

    const created: SourceRow = {
      source: key,
      leads: 0,
      convertedLeads: 0,
      abandonedLeads: 0,
      orders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      invoicedValue: 0,
      paidValue: 0,
      recordedOrderValue: 0,
      newCustomers: 0,
      adSpend: 0,
    };

    sourceMap.set(
      key,
      created,
    );

    return created;
  }

  function ensureCampaign(
    source: string,
    campaign: string,
    medium: string,
  ) {
    const key =
      campaignKey(
        source,
        campaign,
      );
    const existing =
      campaignMap.get(key);

    if (existing) {
      if (
        !existing.medium &&
        medium
      ) {
        existing.medium =
          medium;
      }

      return existing;
    }

    const created: CampaignRow = {
      source,
      campaign,
      medium,
      leads: 0,
      convertedLeads: 0,
      abandonedLeads: 0,
      orders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      invoicedValue: 0,
      paidValue: 0,
      recordedOrderValue: 0,
      newCustomers: 0,
      adSpend: 0,
      contentOrders: {},
    };

    campaignMap.set(
      key,
      created,
    );

    return created;
  }

  for (const lead of leads) {
    const attribution =
      parseAttribution(
        lead.source,
      );
    const source =
      sourceKey(
        attribution.source,
      );
    const sourceRow =
      ensureSource(source);
    const converted =
      lead.status ===
        "CONVERTED" ||
      Boolean(
        lead.convertedOrderId,
      );

    sourceRow.leads += 1;

    if (converted) {
      sourceRow.convertedLeads +=
        1;
    }

    if (
      lead.status ===
      "ABANDONED"
    ) {
      sourceRow.abandonedLeads +=
        1;
    }

    if (
      attribution.campaign
    ) {
      const campaign =
        ensureCampaign(
          source,
          attribution.campaign,
          attribution.medium,
        );

      campaign.leads += 1;

      if (converted) {
        campaign.convertedLeads +=
          1;
      }

      if (
        lead.status ===
        "ABANDONED"
      ) {
        campaign.abandonedLeads +=
          1;
      }
    }
  }

  let totalSpend = 0;

  for (const spend of spends) {
    const source =
      sourceKey(
        spend.source,
      );
    const sourceRow =
      ensureSource(source);

    sourceRow.adSpend +=
      spend.amount;
    totalSpend +=
      spend.amount;

    if (spend.campaign) {
      const campaign =
        ensureCampaign(
          source,
          spend.campaign,
          "",
        );

      campaign.adSpend +=
        spend.amount;
    }
  }

  let attributedOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let invoicedValue = 0;
  let paidValue = 0;
  let recordedOrderValue = 0;

  for (const order of orders) {
    const attribution =
      parseAttribution(
        order.acquisitionSource,
      );
    const source =
      sourceKey(
        attribution.source,
      );
    const sourceRow =
      ensureSource(source);

    const isNewCustomer =
      newCustomerIds.has(
        order.customerId,
      ) &&
      !countedNewCustomers.has(
        order.customerId,
      );

    if (isNewCustomer) {
      countedNewCustomers.add(
        order.customerId,
      );
      sourceRow.newCustomers +=
        1;
    }

    const invoiceTotal =
      moneyNumber(
        order.invoice?.total,
      );
    const invoicePaid =
      moneyNumber(
        order.invoice?.paid,
      );
    const orderValue =
      invoiceTotal ||
      moneyNumber(
        order.finalTotal,
      ) ||
      moneyNumber(
        order.estimatedTotal,
      );

    sourceRow.orders += 1;
    sourceRow.invoicedValue +=
      invoiceTotal;
    sourceRow.paidValue +=
      invoicePaid;
    sourceRow.recordedOrderValue +=
      orderValue;

    if (
      order.status ===
      "COMPLETED"
    ) {
      completedOrders += 1;
      sourceRow.completedOrders +=
        1;
    }

    if (
      order.status ===
      "CANCELLED"
    ) {
      cancelledOrders += 1;
      sourceRow.cancelledOrders +=
        1;
    }

    if (
      order.acquisitionSource
    ) {
      attributedOrders += 1;
    }

    invoicedValue +=
      invoiceTotal;
    paidValue +=
      invoicePaid;
    recordedOrderValue +=
      orderValue;

    if (
      attribution.campaign
    ) {
      const campaign =
        ensureCampaign(
          source,
          attribution.campaign,
          attribution.medium,
        );

      campaign.orders += 1;

      if (isNewCustomer) {
        campaign.newCustomers +=
          1;
      }

      campaign.invoicedValue +=
        invoiceTotal;
      campaign.paidValue +=
        invoicePaid;
      campaign.recordedOrderValue +=
        orderValue;

      if (
        order.status ===
        "COMPLETED"
      ) {
        campaign.completedOrders +=
          1;
      }

      if (
        order.status ===
        "CANCELLED"
      ) {
        campaign.cancelledOrders +=
          1;
      }

      const content =
        attribution.content ||
        "بدون content";

      campaign.contentOrders[
        content
      ] =
        (campaign
          .contentOrders[
          content
        ] || 0) + 1;
    }
  }

  const convertedLeads =
    leads.filter(
      (lead) =>
        lead.status ===
          "CONVERTED" ||
        Boolean(
          lead.convertedOrderId,
        ),
    ).length;

  const abandonedLeads =
    leads.filter(
      (lead) =>
        lead.status ===
        "ABANDONED",
    ).length;

  const openLeads =
    leads.filter(
      (lead) =>
        lead.status ===
          "STARTED" ||
        lead.status ===
          "CONTACTED",
    ).length;

  const sourceRows =
    [...sourceMap.values()]
      .sort(
        (a, b) =>
          b.orders -
            a.orders ||
          b.leads -
            a.leads,
      );

  const campaignRows =
    [...campaignMap.values()]
      .sort(
        (a, b) =>
          b.orders -
            a.orders ||
          b.leads -
            a.leads,
      );

  const topSource =
    sourceRows[0] || null;
  const topCampaign =
    campaignRows[0] || null;

  const averageOrderValue =
    orders.length
      ? recordedOrderValue /
        orders.length
      : 0;

  const newCustomers =
    countedNewCustomers.size;
  const overallCpl =
    leads.length
      ? totalSpend /
        leads.length
      : 0;
  const overallCpa =
    orders.length
      ? totalSpend /
        orders.length
      : 0;
  const overallCac =
    newCustomers
      ? totalSpend /
        newCustomers
      : 0;
  const overallRoas =
    totalSpend
      ? invoicedValue /
        totalSpend
      : 0;
  const collectedRoas =
    totalSpend
      ? paidValue /
        totalSpend
      : 0;
  const marketingContribution =
    invoicedValue -
    totalSpend;

  const topRoasCampaign =
    [...campaignMap.values()]
      .filter(
        (row) =>
          row.adSpend > 0,
      )
      .sort(
        (a, b) =>
          b.invoicedValue /
            b.adSpend -
          a.invoicedValue /
            a.adSpend,
      )[0] || null;

  const dataCoverage =
    percent(
      attributedOrders,
      orders.length,
    );

  const funnel = [1, 2, 3, 4].map(
    (step) => ({
      step,
      count:
        leads.filter(
          (lead) =>
            lead.currentStep >=
            step,
        ).length,
    }),
  );

  const dayMap =
    new Map<
      string,
      {
        leads: number;
        orders: number;
        converted: number;
      }
    >();

  for (
    let i =
      periodDays - 1;
    i >= 0;
    i -= 1
  ) {
    const date =
      new Date(
        Date.now() -
          i *
            24 *
            60 *
            60 *
            1000,
      );
    const key =
      cairoDayKey(date);

    dayMap.set(key, {
      leads: 0,
      orders: 0,
      converted: 0,
    });
  }

  for (const lead of leads) {
    const key =
      cairoDayKey(
        lead.createdAt,
      );
    const item =
      dayMap.get(key);

    if (!item) continue;

    item.leads += 1;

    if (
      lead.status ===
        "CONVERTED" ||
      lead.convertedOrderId
    ) {
      item.converted += 1;
    }
  }

  for (const order of orders) {
    const key =
      cairoDayKey(
        order.createdAt,
      );
    const item =
      dayMap.get(key);

    if (item) {
      item.orders += 1;
    }
  }

  const trend =
    [...dayMap.entries()];
  const chartMax =
    Math.max(
      1,
      ...trend.flatMap(
        ([, item]) => [
          item.leads,
          item.orders,
        ],
      ),
    );

  const exportRows = [
    ...sourceRows.map(
      (row) => ({
        type: "source",
        source: row.source,
        campaign: "",
        leads: row.leads,
        convertedLeads:
          row.convertedLeads,
        orders: row.orders,
        completedOrders:
          row.completedOrders,
        newCustomers:
          row.newCustomers,
        paidValue:
          Math.round(
            row.paidValue *
              100,
          ) / 100,
        adSpend:
          Math.round(
            row.adSpend *
              100,
          ) / 100,
        cpl:
          row.leads
            ? Math.round(
                (row.adSpend /
                  row.leads) *
                  100,
              ) / 100
            : 0,
        cpa:
          row.orders
            ? Math.round(
                (row.adSpend /
                  row.orders) *
                  100,
              ) / 100
            : 0,
        cac:
          row.newCustomers
            ? Math.round(
                (row.adSpend /
                  row.newCustomers) *
                  100,
              ) / 100
            : 0,
        roas:
          row.adSpend
            ? Math.round(
                (row.invoicedValue /
                  row.adSpend) *
                  100,
              ) / 100
            : 0,
        collectedRoas:
          row.adSpend
            ? Math.round(
                (row.paidValue /
                  row.adSpend) *
                  100,
              ) / 100
            : 0,
        marketingContribution:
          Math.round(
            (row.invoicedValue -
              row.adSpend) *
              100,
          ) / 100,
        invoicedValue:
          Math.round(
            row.invoicedValue *
              100,
          ) / 100,
        averageOrderValue:
          row.orders
            ? Math.round(
                (row.recordedOrderValue /
                  row.orders) *
                  100,
              ) / 100
            : 0,
      }),
    ),
    ...campaignRows.map(
      (row) => ({
        type: "campaign",
        source: row.source,
        campaign:
          row.campaign,
        leads: row.leads,
        convertedLeads:
          row.convertedLeads,
        orders: row.orders,
        completedOrders:
          row.completedOrders,
        newCustomers:
          row.newCustomers,
        paidValue:
          Math.round(
            row.paidValue *
              100,
          ) / 100,
        adSpend:
          Math.round(
            row.adSpend *
              100,
          ) / 100,
        cpl:
          row.leads
            ? Math.round(
                (row.adSpend /
                  row.leads) *
                  100,
              ) / 100
            : 0,
        cpa:
          row.orders
            ? Math.round(
                (row.adSpend /
                  row.orders) *
                  100,
              ) / 100
            : 0,
        cac:
          row.newCustomers
            ? Math.round(
                (row.adSpend /
                  row.newCustomers) *
                  100,
              ) / 100
            : 0,
        roas:
          row.adSpend
            ? Math.round(
                (row.invoicedValue /
                  row.adSpend) *
                  100,
              ) / 100
            : 0,
        collectedRoas:
          row.adSpend
            ? Math.round(
                (row.paidValue /
                  row.adSpend) *
                  100,
              ) / 100
            : 0,
        marketingContribution:
          Math.round(
            (row.invoicedValue -
              row.adSpend) *
              100,
          ) / 100,
        invoicedValue:
          Math.round(
            row.invoicedValue *
              100,
          ) / 100,
        averageOrderValue:
          row.orders
            ? Math.round(
                (row.recordedOrderValue /
                  row.orders) *
                  100,
              ) / 100
            : 0,
      }),
    ),
  ];

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
              تحليلات التسويق
            </h1>
            <p
              style={{
                marginTop: 0,
                color: "#64748b",
              }}
            >
              من أول الـLead لحد الأوردر والفاتورة — حسب المصدر والحملة.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems:
                "center",
            }}
          >
            <MarketingAnalyticsExport
              periodDays={
                periodDays
              }
              rows={exportRows}
            />
            {user.role === "SUPER_ADMIN" && (
              <Link
                href="/admin/marketing-spend"
                style={secondaryAction}
              >
                تسجيل تكلفة إعلان
              </Link>
            )}
            <Link
              href="/admin/marketing"
              style={secondaryAction}
            >
              إنشاء رابط حملة
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            margin: "18px 0",
          }}
        >
          {[7, 30, 90].map(
            (days) => (
              <Link
                key={days}
                href={`/admin/marketing-analytics?period=${days}`}
                style={{
                  ...periodButton,
                  ...(days ===
                  periodDays
                    ? activePeriodButton
                    : {}),
                }}
              >
                آخر {days} يوم
              </Link>
            ),
          )}
        </div>

        <div style={statsStyle}>
          <Stat
            label="Leads"
            value={
              leads.length
            }
          />
          <Stat
            label="تحولوا لأوردر"
            value={
              convertedLeads
            }
            meta={`${percent(
              convertedLeads,
              leads.length,
            ).toFixed(1)}% من Leads`}
          />
          <Stat
            label="الأوردرات"
            value={
              orders.length
            }
          />
          <Stat
            label="مكتملة"
            value={
              completedOrders
            }
            meta={`${percent(
              completedOrders,
              orders.length,
            ).toFixed(1)}%`}
          />
          <Stat
            label="ملغية"
            value={
              cancelledOrders
            }
            danger={
              percent(
                cancelledOrders,
                orders.length,
              ) > 15
            }
          />
          <Stat
            label="قيمة الفواتير"
            value={`${money(
              invoicedValue,
            )} ج`}
          />
          <Stat
            label="المحصل"
            value={`${money(
              paidValue,
            )} ج`}
          />
          <Stat
            label="تكلفة الإعلانات"
            value={`${money(
              totalSpend,
            )} ج`}
            meta="المسجلة يدويًا للفترة"
          />
          <Stat
            label="CPL — تكلفة الـLead"
            value={`${money(
              overallCpl,
            )} ج`}
            meta={leads.length ? "Spend ÷ Leads" : "لا توجد Leads"}
          />
          <Stat
            label="CPA — تكلفة الأوردر"
            value={`${money(
              overallCpa,
            )} ج`}
            meta={orders.length ? "Spend ÷ Orders" : "لا توجد Orders"}
          />
          <Stat
            label="CAC — عميل جديد"
            value={`${money(
              overallCac,
            )} ج`}
            meta={`${newCustomers} عميل جديد`}
          />
          <Stat
            label="ROAS الفواتير"
            value={totalSpend ? `${overallRoas.toFixed(2)}x` : "-"}
            meta="قيمة الفواتير ÷ الإعلان"
          />
          <Stat
            label="ROAS المحصل"
            value={totalSpend ? `${collectedRoas.toFixed(2)}x` : "-"}
            meta="المحصل ÷ الإعلان"
          />
          <Stat
            label="بعد تكلفة الإعلان فقط"
            value={`${money(
              marketingContribution,
            )} ج`}
            danger={marketingContribution < 0}
            meta="قبل الخامات والأجور وباقي التشغيل"
          />
          <Stat
            label="متوسط قيمة الطلب"
            value={`${money(
              averageOrderValue,
            )} ج`}
            meta="فاتورة أو قيمة نهائية/تقديرية"
          />
          <Stat
            label="تغطية المصدر"
            value={`${dataCoverage.toFixed(
              1,
            )}%`}
            danger={
              dataCoverage < 80
            }
            meta={`${attributedOrders} من ${orders.length} أوردر`}
          />
        </div>

        <div style={twoColStyle}>
          <Panel title="ملخص القنوات">
            <Highlight
              label="أفضل مصدر"
              value={
                topSource
                  ? `${topSource.source} — ${topSource.orders} أوردر`
                  : "لا توجد بيانات"
              }
            />
            <Highlight
              label="أفضل حملة"
              value={
                topCampaign
                  ? `${topCampaign.campaign} — ${topCampaign.orders} أوردر`
                  : "لا توجد حملات مسجلة"
              }
            />
            <Highlight
              label="أفضل ROAS"
              value={
                topRoasCampaign
                  ? `${topRoasCampaign.campaign} — ${(topRoasCampaign.invoicedValue / topRoasCampaign.adSpend).toFixed(2)}x`
                  : "سجل تكلفة حملات لاحتسابه"
              }
            />
            <Highlight
              label="Leads مفتوحة"
              value={`${openLeads}`}
            />
            <Highlight
              label="Leads غير مكتملة"
              value={`${abandonedLeads}`}
              danger={
                abandonedLeads > 0
              }
            />
          </Panel>

          <Panel title="قمع الطلب">
            {funnel.map(
              (item) => (
                <FunnelRow
                  key={
                    item.step
                  }
                  label={
                    item.step === 1
                      ? "بدأ الرحلة"
                      : item.step === 2
                        ? "وصل تفاصيل الأماكن"
                        : item.step === 3
                          ? "وصل بيانات العميل"
                          : "وصل المرحلة الأخيرة"
                  }
                  value={
                    item.count
                  }
                  percentValue={percent(
                    item.count,
                    leads.length,
                  )}
                />
              ),
            )}
            <FunnelRow
              label="تحول لأوردر"
              value={
                convertedLeads
              }
              percentValue={percent(
                convertedLeads,
                leads.length,
              )}
              strong
            />
          </Panel>
        </div>

        <Panel
          title={`الحركة اليومية — آخر ${periodDays} يوم`}
          wide
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems:
                "center",
              color: "#64748b",
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            <span>
              <b
                style={{
                  color:
                    "#0f2d4a",
                }}
              >
                ■
              </b>{" "}
              Leads
            </span>
            <span>
              <b
                style={{
                  color:
                    "#f97316",
                }}
              >
                ■
              </b>{" "}
              Orders
            </span>
          </div>

          <div
            style={{
              overflowX: "auto",
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                minWidth:
                  periodDays *
                    34,
                height: 210,
                display: "flex",
                gap: 5,
                alignItems:
                  "flex-end",
                borderBottom:
                  "1px solid #cbd5e1",
                padding:
                  "0 4px 8px",
              }}
            >
              {trend.map(
                ([
                  date,
                  item,
                ]) => (
                  <div
                    key={date}
                    title={`${date} — Leads ${item.leads} — Orders ${item.orders}`}
                    style={{
                      width: 28,
                      flex: "0 0 28px",
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: 2,
                      alignItems:
                        "end",
                      height: 180,
                      position:
                        "relative",
                    }}
                  >
                    <div
                      style={{
                        height: `${Math.max(
                          item.leads
                            ? 7
                            : 0,
                          (item.leads /
                            chartMax) *
                            150,
                        )}px`,
                        background:
                          "#0f2d4a",
                        borderRadius:
                          "4px 4px 0 0",
                      }}
                    />
                    <div
                      style={{
                        height: `${Math.max(
                          item.orders
                            ? 7
                            : 0,
                          (item.orders /
                            chartMax) *
                            150,
                        )}px`,
                        background:
                          "#f97316",
                        borderRadius:
                          "4px 4px 0 0",
                      }}
                    />
                  </div>
                ),
              )}
            </div>
          </div>

          <p
            style={{
              color: "#64748b",
              fontSize: 12,
              marginBottom: 0,
            }}
          >
            مرّر أفقيًا على الموبايل. اضغط مطولًا/حرّك المؤشر فوق العمود لرؤية رقم اليوم.
          </p>
        </Panel>

        <Panel
          title="الأداء حسب المصدر"
          wide
        >
          {sourceRows.length ===
          0 ? (
            <p>
              لا توجد بيانات للفترة المختارة.
            </p>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                style={{
                  width:
                    "100%",
                  minWidth: 980,
                }}
              >
                <thead>
                  <tr>
                    <th>
                      المصدر
                    </th>
                    <th>
                      Leads
                    </th>
                    <th>
                      تحويل Lead
                    </th>
                    <th>
                      Orders
                    </th>
                    <th>
                      مكتمل
                    </th>
                    <th>
                      ملغي
                    </th>
                    <th>
                      قيمة الفواتير
                    </th>
                    <th>
                      المحصل
                    </th>
                    <th>
                      متوسط الطلب
                    </th>
                    <th>
                      تكلفة الإعلان
                    </th>
                    <th>
                      CPL
                    </th>
                    <th>
                      CPA
                    </th>
                    <th>
                      CAC
                    </th>
                    <th>
                      ROAS
                    </th>
                    <th>
                      بعد الإعلان فقط
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sourceRows.map(
                    (row) => (
                      <tr
                        key={
                          row.source
                        }
                      >
                        <td>
                          <strong>
                            {
                              row.source
                            }
                          </strong>
                        </td>
                        <td>
                          {
                            row.leads
                          }
                        </td>
                        <td>
                          {percent(
                            row.convertedLeads,
                            row.leads,
                          ).toFixed(
                            1,
                          )}
                          %
                        </td>
                        <td>
                          {
                            row.orders
                          }
                        </td>
                        <td>
                          {
                            row.completedOrders
                          }
                        </td>
                        <td>
                          {
                            row.cancelledOrders
                          }
                        </td>
                        <td>
                          {money(
                            row.invoicedValue,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          {money(
                            row.paidValue,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          {money(
                            row.orders
                              ? row.recordedOrderValue /
                                  row.orders
                              : 0,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          {money(
                            row.adSpend,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          {row.leads
                            ? `${money(row.adSpend / row.leads)} ج`
                            : "-"}
                        </td>
                        <td>
                          {row.orders
                            ? `${money(row.adSpend / row.orders)} ج`
                            : "-"}
                        </td>
                        <td>
                          {row.newCustomers
                            ? `${money(row.adSpend / row.newCustomers)} ج`
                            : "-"}
                        </td>
                        <td>
                          {row.adSpend
                            ? `${(row.invoicedValue / row.adSpend).toFixed(2)}x`
                            : "-"}
                        </td>
                        <td>
                          {money(
                            row.invoicedValue -
                              row.adSpend,
                          )}{" "}
                          ج
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="الأداء حسب الحملة"
          wide
        >
          {campaignRows.length ===
          0 ? (
            <div
              style={{
                color:
                  "#64748b",
              }}
            >
              لا توجد UTM campaigns في الفترة المختارة. استخدم{" "}
              <Link
                href="/admin/marketing"
                style={{
                  color:
                    "#075985",
                  fontWeight: 900,
                }}
              >
                روابط الحملات
              </Link>{" "}
              للإعلانات القادمة.
            </div>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                style={{
                  width:
                    "100%",
                  minWidth: 1120,
                }}
              >
                <thead>
                  <tr>
                    <th>
                      الحملة
                    </th>
                    <th>
                      المصدر
                    </th>
                    <th>
                      Medium
                    </th>
                    <th>
                      Leads
                    </th>
                    <th>
                      تحويل Lead
                    </th>
                    <th>
                      Orders
                    </th>
                    <th>
                      مكتمل
                    </th>
                    <th>
                      الفواتير
                    </th>
                    <th>
                      متوسط الطلب
                    </th>
                    <th>
                      التكلفة
                    </th>
                    <th>
                      CPA
                    </th>
                    <th>
                      CAC
                    </th>
                    <th>
                      ROAS
                    </th>
                    <th>
                      بعد الإعلان فقط
                    </th>
                    <th>
                      أفضل Content
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaignRows.map(
                    (row) => {
                      const bestContent =
                        Object.entries(
                          row.contentOrders,
                        ).sort(
                          (
                            a,
                            b,
                          ) =>
                            b[1] -
                            a[1],
                        )[0];

                      return (
                        <tr
                          key={`${row.source}:${row.campaign}`}
                        >
                          <td>
                            <strong>
                              {
                                row.campaign
                              }
                            </strong>
                          </td>
                          <td>
                            {
                              row.source
                            }
                          </td>
                          <td>
                            {row.medium ||
                              "-"}
                          </td>
                          <td>
                            {
                              row.leads
                            }
                          </td>
                          <td>
                            {percent(
                              row.convertedLeads,
                              row.leads,
                            ).toFixed(
                              1,
                            )}
                            %
                          </td>
                          <td>
                            {
                              row.orders
                            }
                          </td>
                          <td>
                            {
                              row.completedOrders
                            }
                          </td>
                          <td>
                            {money(
                              row.invoicedValue,
                            )}{" "}
                            ج
                          </td>
                          <td>
                            {money(
                              row.orders
                                ? row.recordedOrderValue /
                                    row.orders
                                : 0,
                            )}{" "}
                            ج
                          </td>
                          <td>
                            {money(
                              row.adSpend,
                            )}{" "}
                            ج
                          </td>
                          <td>
                            {row.orders
                              ? `${money(row.adSpend / row.orders)} ج`
                              : "-"}
                          </td>
                          <td>
                            {row.newCustomers
                              ? `${money(row.adSpend / row.newCustomers)} ج`
                              : "-"}
                          </td>
                          <td>
                            {row.adSpend
                              ? `${(row.invoicedValue / row.adSpend).toFixed(2)}x`
                              : "-"}
                          </td>
                          <td>
                            {money(
                              row.invoicedValue -
                                row.adSpend,
                            )}{" "}
                            ج
                          </td>
                          <td>
                            {bestContent
                              ? `${bestContent[0]} (${bestContent[1]})`
                              : "-"}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <section
          style={{
            marginTop: 16,
            padding: 15,
            background: "#fff7ed",
            border:
              "1px solid #fed7aa",
            borderRadius: 14,
            color: "#9a3412",
            lineHeight: 1.8,
          }}
        >
          <strong>
            مهم لفهم الأرقام
          </strong>
          <div>
            قيمة الفواتير والمحصل جاية من بيانات Ventic Pro الفعلية، وتكلفة الإعلان جاية من السجلات اليدوية في «تكلفة الإعلانات». CPA هنا = تكلفة الإعلان ÷ عدد الأوردرات، وCAC = تكلفة الإعلان ÷ العملاء الجدد، وROAS = قيمة الفواتير ÷ تكلفة الإعلان. رقم «بعد تكلفة الإعلان فقط» ليس صافي ربح؛ لأنه لا يخصم الخامات أو أجور الفنيين أو المصروفات التشغيلية.
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  meta,
  danger = false,
}: {
  label: string;
  value: string | number;
  meta?: string;
  danger?: boolean;
}) {
  return (
    <div style={statStyle}>
      <b
        style={{
          fontSize: 23,
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
          fontSize: 12,
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

function Panel({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      style={{
        ...panelStyle,
        ...(wide
          ? {
              marginTop: 16,
            }
          : {}),
      }}
    >
      <h2
        style={{
          marginTop: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Highlight({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        gap: 10,
        borderBottom:
          "1px solid #e2e8f0",
        padding: "9px 0",
      }}
    >
      <span>
        {label}
      </span>
      <strong
        style={{
          color: danger
            ? "#b91c1c"
            : "#0f2d4a",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  percentValue,
  strong = false,
}: {
  label: string;
  value: number;
  percentValue: number;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 10,
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontWeight:
              strong
                ? 900
                : 700,
          }}
        >
          {label}
        </span>
        <b
          style={{
            color: "#0f2d4a",
          }}
        >
          {value} —{" "}
          {percentValue.toFixed(
            1,
          )}
          %
        </b>
      </div>
      <div
        style={{
          height: 9,
          background: "#e2e8f0",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(
              100,
              percentValue,
            )}%`,
            background: strong
              ? "#f97316"
              : "#0f2d4a",
          }}
        />
      </div>
    </div>
  );
}

const headStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const statsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(165px,1fr))",
  gap: 10,
  margin: "0 0 16px",
};

const statStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 4,
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(340px,1fr))",
  gap: 16,
};

const panelStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};

const periodButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 36,
  borderRadius: 999,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f2d4a",
  textDecoration: "none",
  padding: "0 12px",
  fontWeight: 900,
};

const activePeriodButton: React.CSSProperties = {
  background: "#0f2d4a",
  color: "white",
  borderColor: "#0f2d4a",
};

const secondaryAction: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 40,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f2d4a",
  textDecoration: "none",
  padding: "0 13px",
  fontWeight: 900,
};
