import Link from "next/link";
import { redirect } from "next/navigation";
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
  orderCostCategoryLabel,
} from "@/lib/order-costs";
import { parseInventoryNote } from "@/lib/inventory";
import { safeDiagnostic } from "@/lib/safe-diagnostics";
import OrderCostManager from "./OrderCostManager";
import ProfitabilityExport from "./ProfitabilityExport";

export const dynamic =
  "force-dynamic";

type SearchParams = Promise<{
  period?: string;
}>;

function safePeriod(
  value: string | undefined,
) {
  const parsed =
    Number(value);

  return [
    7,
    30,
    90,
    365,
  ].includes(parsed)
    ? parsed
    : 30;
}

function money(
  value: number,
) {
  return value.toLocaleString(
    "ar-EG",
    {
      maximumFractionDigits: 0,
    },
  );
}

function pct(
  value: number,
) {
  return `${value.toFixed(
    1,
  )}%`;
}

function sourceKey(
  value: string,
) {
  return value.trim() ||
    "غير معروف / مباشر";
}

function marketingKey(
  source: string,
  campaign: string,
) {
  return `${source.trim().toLowerCase()}::${campaign
    .trim()
    .toLowerCase()}`;
}

const statusLabels: Record<
  string,
  string
> = {
  NEW: "جديد",
  CONFIRMED: "تم التأكيد",
  ASSIGNED: "تم تعيين فني",
  ON_THE_WAY: "في الطريق",
  ARRIVED: "وصل الفني",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user =
    await currentUser();

  if (!user) {
    redirect("/login");
  }

  const canView =
    can(
      user.role,
      PERMISSIONS.REPORTS_VIEW,
      user.permissions,
    ) &&
    can(
      user.role,
      PERMISSIONS.INVENTORY_COST_VIEW,
      user.permissions,
    );

  if (!canView) {
    redirect("/admin");
  }

  const canManageCosts =
    can(
      user.role,
      PERMISSIONS.PAYMENTS_MANAGE,
      user.permissions,
    );

  const params =
    await searchParams;
  const periodDays =
    safePeriod(
      params.period,
    );
  const since =
    new Date(
      Date.now() -
        periodDays *
          24 *
          60 *
          60 *
          1000,
    );

  const [
    orders,
    spendAuditLogs,
    costAuditLogs,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      select: {
        id: true,
        orderNo: true,
        status: true,
        acquisitionSource: true,
        governorate: true,
        area: true,
        travelFeeSnapshot: true,
        estimatedTotal: true,
        finalTotal: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
          },
        },
        invoice: {
          select: {
            total: true,
            paid: true,
            due: true,
          },
        },
        spaces: {
          select: {
            services: {
              select: {
                serviceCodeSnapshot:
                  true,
                serviceNameSnapshot:
                  true,
                qty: true,
                unitPriceSnapshot:
                  true,
              },
            },
          },
        },
        inventoryMovements: {
          select: {
            id: true,
            type: true,
            quantity: true,
            note: true,
            item: {
              select: {
                nameAr: true,
                unit: true,
                averageUnitCost:
                  true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
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
        orderId: true,
        action: true,
        actorLabel: true,
        newValue: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
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
        item.spentAt >=
          since &&
        item.spentAt <=
          new Date(),
    );

  const orderCosts =
    materializeOrderCosts(
      costAuditLogs,
    );

  const orderCostMap =
    new Map<
      string,
      number
    >();

  for (const cost of orderCosts) {
    orderCostMap.set(
      cost.orderId,
      (orderCostMap.get(
        cost.orderId,
      ) || 0) +
        cost.amount,
    );
  }

  const attributionByOrder =
    new Map<
      string,
      ReturnType<
        typeof parseAttribution
      >
    >();

  for (const order of orders) {
    attributionByOrder.set(
      order.id,
      parseAttribution(
        order.acquisitionSource,
      ),
    );
  }

  const allocatedAdCost =
    new Map<
      string,
      number
    >();
  let unallocatedAdSpend =
    0;

  for (const spend of spends) {
    const spendSource =
      spend.source
        .trim()
        .toLowerCase();
    const spendCampaign =
      spend.campaign
        .trim()
        .toLowerCase();

    const eligible =
      orders.filter(
        (order) => {
          const attr =
            attributionByOrder.get(
              order.id,
            );

          if (!attr) {
            return false;
          }

          if (
            attr.source
              .trim()
              .toLowerCase() !==
            spendSource
          ) {
            return false;
          }

          if (
            spendCampaign &&
            attr.campaign
              .trim()
              .toLowerCase() !==
              spendCampaign
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
      allocatedAdCost.set(
        order.id,
        (allocatedAdCost.get(
          order.id,
        ) || 0) +
          perOrder,
      );
    }
  }

  const rows =
    orders.map((order) => {
      const attribution =
        attributionByOrder.get(
          order.id,
        ) ||
        parseAttribution(null);

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

      const paid =
        moneyNumber(
          order.invoice?.paid,
        );

      const materialCost =
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

      const adCost =
        allocatedAdCost.get(
          order.id,
        ) || 0;
      const manualCost =
        orderCostMap.get(
          order.id,
        ) || 0;
      const knownCost =
        materialCost +
        adCost +
        manualCost;
      const contribution =
        revenue -
        knownCost;
      const marginPercent =
        revenue > 0
          ? (contribution /
              revenue) *
            100
          : knownCost > 0
            ? -100
            : 0;

      const serviceLines =
        order.spaces.flatMap(
          (space) =>
            space.services.map(
              (service) => ({
                code:
                  service.serviceCodeSnapshot,
                name:
                  service.serviceNameSnapshot,
                salesValue:
                  moneyNumber(
                    service.qty,
                  ) *
                  moneyNumber(
                    service.unitPriceSnapshot,
                  ),
              }),
            ),
        );

      return {
        id: order.id,
        orderNo:
          order.orderNo,
        customer:
          order.customer.name,
        status:
          order.status,
        source:
          sourceKey(
            attribution.source,
          ),
        campaign:
          attribution.campaign,
        area: [
          order.governorate,
          order.area,
        ]
          .filter(Boolean)
          .join(" — ") ||
          "غير محدد",
        revenue,
        paid,
        materialCost,
        adCost,
        manualCost,
        knownCost,
        contribution,
        marginPercent,
        travelFee:
          moneyNumber(
            order.travelFeeSnapshot,
          ),
        serviceLines,
      };
    });

  const totals =
    rows.reduce(
      (acc, row) => {
        acc.revenue +=
          row.revenue;
        acc.paid +=
          row.paid;
        acc.materialCost +=
          row.materialCost;
        acc.adCost +=
          row.adCost;
        acc.manualCost +=
          row.manualCost;
        acc.knownCost +=
          row.knownCost;
        acc.contribution +=
          row.contribution;

        if (
          row.contribution < 0
        ) {
          acc.negative += 1;
        }

        return acc;
      },
      {
        revenue: 0,
        paid: 0,
        materialCost: 0,
        adCost: 0,
        manualCost: 0,
        knownCost: 0,
        contribution: 0,
        negative: 0,
      },
    );

  const totalMargin =
    totals.revenue > 0
      ? (totals.contribution /
          totals.revenue) *
        100
      : 0;

  const areaMap =
    new Map<
      string,
      {
        orders: number;
        revenue: number;
        cost: number;
        contribution: number;
      }
    >();

  const serviceMap =
    new Map<
      string,
      {
        name: string;
        orders: Set<string>;
        revenue: number;
        cost: number;
        contribution: number;
      }
    >();

  for (const row of rows) {
    const area =
      areaMap.get(
        row.area,
      ) || {
        orders: 0,
        revenue: 0,
        cost: 0,
        contribution: 0,
      };

    area.orders += 1;
    area.revenue +=
      row.revenue;
    area.cost +=
      row.knownCost;
    area.contribution +=
      row.contribution;
    areaMap.set(
      row.area,
      area,
    );

    const totalServiceValue =
      row.serviceLines.reduce(
        (sum, line) =>
          sum +
          line.salesValue,
        0,
      );
    const lineCount =
      row.serviceLines.length;

    for (const line of row.serviceLines) {
      const weight =
        totalServiceValue > 0
          ? line.salesValue /
            totalServiceValue
          : lineCount > 0
            ? 1 / lineCount
            : 0;

      const key =
        `${line.code}::${line.name}`;
      const item =
        serviceMap.get(
          key,
        ) || {
          name: line.name,
          orders:
            new Set<string>(),
          revenue: 0,
          cost: 0,
          contribution: 0,
        };

      item.orders.add(
        row.id,
      );
      item.revenue +=
        row.revenue *
        weight;
      item.cost +=
        row.knownCost *
        weight;
      item.contribution +=
        row.contribution *
        weight;

      serviceMap.set(
        key,
        item,
      );
    }
  }

  const topAreas =
    [...areaMap.entries()]
      .map(
        ([name, item]) => ({
          name,
          ...item,
          margin:
            item.revenue > 0
              ? (item.contribution /
                  item.revenue) *
                100
              : 0,
        }),
      )
      .sort(
        (a, b) =>
          b.contribution -
          a.contribution,
      )
      .slice(0, 10);

  const topServices =
    [...serviceMap.values()]
      .map((item) => ({
        name:
          item.name,
        orders:
          item.orders.size,
        revenue:
          item.revenue,
        cost:
          item.cost,
        contribution:
          item.contribution,
        margin:
          item.revenue > 0
            ? (item.contribution /
                item.revenue) *
              100
            : 0,
      }))
      .sort(
        (a, b) =>
          b.contribution -
          a.contribution,
      )
      .slice(0, 10);

  const activePeriodCosts =
    orderCosts.filter(
      (cost) =>
        rows.some(
          (row) =>
            row.id ===
            cost.orderId,
        ),
    );

  safeDiagnostic(
    "profitability.view",
    {
      periodDays,
      orderCount:
        rows.length,
      negativeCount:
        totals.negative,
      unallocatedAdSpend:
        Math.round(
          unallocatedAdSpend *
            100,
        ) / 100,
    },
  );

  const exportRows =
    rows.map((row) => ({
      orderNo:
        row.orderNo,
      customer:
        row.customer,
      status:
        statusLabels[
          row.status
        ] || row.status,
      source:
        row.source,
      area:
        row.area,
      revenue:
        round2(
          row.revenue,
        ),
      paid:
        round2(
          row.paid,
        ),
      materialCost:
        round2(
          row.materialCost,
        ),
      adCost:
        round2(
          row.adCost,
        ),
      manualCost:
        round2(
          row.manualCost,
        ),
      knownCost:
        round2(
          row.knownCost,
        ),
      contribution:
        round2(
          row.contribution,
        ),
      marginPercent:
        round2(
          row.marginPercent,
        ),
    }));

  return (
    <main
      className="admin"
      dir="rtl"
    >
      <section
        style={{
          maxWidth: 1550,
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
              ربحية الطلبات
            </h1>
            <p
              style={{
                marginTop: 0,
                color: "#64748b",
                lineHeight: 1.8,
              }}
            >
              هامش مساهمة معروف بعد الخامات والإعلان وتكاليف التشغيل المباشرة المسجلة — وليس صافي ربح محاسبي.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <ProfitabilityExport
              periodDays={
                periodDays
              }
              rows={
                exportRows
              }
            />
            <Link
              href="/admin/marketing-analytics"
              style={secondaryAction}
            >
              تحليلات التسويق
            </Link>
          </div>
        </div>

        <div style={periodRow}>
          {[7, 30, 90, 365].map(
            (days) => (
              <Link
                key={days}
                href={`/admin/profitability?period=${days}`}
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

        <div style={statsGrid}>
          <Stat
            label="قيمة الطلبات"
            value={`${money(
              totals.revenue,
            )} ج`}
          />
          <Stat
            label="المحصل"
            value={`${money(
              totals.paid,
            )} ج`}
          />
          <Stat
            label="تكلفة الخامات التقديرية"
            value={`${money(
              totals.materialCost,
            )} ج`}
            meta="حسب متوسط تكلفة الصنف الحالي"
          />
          <Stat
            label="الإعلان الموزع على الطلبات"
            value={`${money(
              totals.adCost,
            )} ج`}
          />
          <Stat
            label="تكاليف تشغيل يدوية"
            value={`${money(
              totals.manualCost,
            )} ج`}
          />
          <Stat
            label="إجمالي التكلفة المعروفة"
            value={`${money(
              totals.knownCost,
            )} ج`}
          />
          <Stat
            label="هامش المساهمة المعروف"
            value={`${money(
              totals.contribution,
            )} ج`}
            danger={
              totals.contribution <
              0
            }
          />
          <Stat
            label="نسبة الهامش"
            value={pct(
              totalMargin,
            )}
            danger={
              totalMargin < 0
            }
          />
          <Stat
            label="طلبات بهامش سلبي"
            value={
              totals.negative
            }
            danger={
              totals.negative > 0
            }
          />
          <Stat
            label="إعلان غير موزع"
            value={`${money(
              unallocatedAdSpend,
            )} ج`}
            danger={
              unallocatedAdSpend >
              0
            }
            meta="تكلفة مصدر/حملة بدون Orders مطابقة في الفترة"
          />
        </div>

        {canManageCosts && (
          <div
            style={{
              marginBottom: 16,
            }}
          >
            <OrderCostManager
              orders={rows.map(
                (row) => ({
                  id: row.id,
                  orderNo:
                    row.orderNo,
                  customerName:
                    row.customer,
                }),
              )}
              costs={activePeriodCosts.map(
                (item) => ({
                  id: item.id,
                  orderId:
                    item.orderId,
                  category:
                    item.category,
                  categoryLabel:
                    orderCostCategoryLabel(
                      item.category,
                    ),
                  amount:
                    item.amount,
                  occurredAt:
                    item.occurredAt.toISOString(),
                  note:
                    item.note,
                  actorLabel:
                    item.actorLabel,
                }),
              )}
            />
          </div>
        )}

        <div style={twoCol}>
          <Panel title="أعلى المناطق من حيث الهامش المعروف">
            {topAreas.length ===
            0 ? (
              <p>
                لا توجد بيانات.
              </p>
            ) : (
              topAreas.map(
                (item) => (
                  <Row
                    key={
                      item.name
                    }
                    title={
                      item.name
                    }
                    value={`${money(
                      item.contribution,
                    )} ج`}
                    meta={`${item.orders} طلب · هامش ${pct(
                      item.margin,
                    )}`}
                    danger={
                      item.contribution <
                      0
                    }
                  />
                ),
              )
            )}
          </Panel>

          <Panel title="أعلى الخدمات من حيث الهامش المعروف">
            {topServices.length ===
            0 ? (
              <p>
                لا توجد بيانات.
              </p>
            ) : (
              topServices.map(
                (item) => (
                  <Row
                    key={
                      item.name
                    }
                    title={
                      item.name
                    }
                    value={`${money(
                      item.contribution,
                    )} ج`}
                    meta={`${item.orders} طلب · هامش ${pct(
                      item.margin,
                    )}`}
                    danger={
                      item.contribution <
                      0
                    }
                  />
                ),
              )
            )}
          </Panel>
        </div>

        <section
          style={{
            ...panelStyle,
            marginTop: 16,
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            تفاصيل كل طلب
          </h2>

          {rows.length === 0 ? (
            <p>
              لا توجد طلبات في الفترة المختارة.
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
                  width: "100%",
                  minWidth: 1420,
                }}
              >
                <thead>
                  <tr>
                    <th>الطلب</th>
                    <th>العميل</th>
                    <th>الحالة</th>
                    <th>المصدر</th>
                    <th>المنطقة</th>
                    <th>القيمة</th>
                    <th>المحصل</th>
                    <th>الخامات</th>
                    <th>الإعلان</th>
                    <th>تشغيل يدوي</th>
                    <th>التكلفة المعروفة</th>
                    <th>الهامش المعروف</th>
                    <th>النسبة</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(
                    (row) => (
                      <tr
                        key={
                          row.id
                        }
                      >
                        <td>
                          <strong>
                            {
                              row.orderNo
                            }
                          </strong>
                          {row.campaign && (
                            <small
                              style={{
                                display:
                                  "block",
                                color:
                                  "#64748b",
                              }}
                            >
                              {
                                row.campaign
                              }
                            </small>
                          )}
                        </td>
                        <td>
                          {
                            row.customer
                          }
                        </td>
                        <td>
                          {statusLabels[
                            row.status
                          ] ||
                            row.status}
                        </td>
                        <td>
                          {
                            row.source
                          }
                        </td>
                        <td>
                          {
                            row.area
                          }
                        </td>
                        <td>
                          {money(
                            row.revenue,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          {money(
                            row.paid,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          {money(
                            row.materialCost,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          {money(
                            row.adCost,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          {money(
                            row.manualCost,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          {money(
                            row.knownCost,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          <strong
                            style={{
                              color:
                                row.contribution <
                                0
                                  ? "#b91c1c"
                                  : "#166534",
                            }}
                          >
                            {money(
                              row.contribution,
                            )}{" "}
                            ج
                          </strong>
                        </td>
                        <td>
                          <b
                            style={{
                              color:
                                row.marginPercent <
                                0
                                  ? "#b91c1c"
                                  : "#0f2d4a",
                            }}
                          >
                            {pct(
                              row.marginPercent,
                            )}
                          </b>
                        </td>
                        <td>
                          <Link
                            href={`/admin/orders/${row.id}#financials`}
                            style={{
                              color:
                                "#075985",
                              fontWeight: 900,
                            }}
                          >
                            فتح
                          </Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={warningStyle}>
          <strong>
            معنى الأرقام هنا
          </strong>
          <div>
            «هامش المساهمة المعروف» = قيمة الطلب − الخامات التقديرية − نصيب الطلب من تكلفة الإعلان − التكاليف التشغيلية اليدوية المسجلة. الخامات القديمة تُحسب بمتوسط تكلفة الصنف الحالي لأن النظام لا يملك Cost Snapshot تاريخي لكل حركة. هذا الرقم لا يخصم الإيجار والمرتبات والضرائب والمصاريف العامة، لذلك لا نسميه صافي ربح.
          </div>
        </section>
      </section>
    </main>
  );
}

function round2(
  value: number,
) {
  return (
    Math.round(
      value * 100,
    ) / 100
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
          fontSize: 22,
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
            lineHeight: 1.5,
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
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <h2
        style={{
          marginTop: 0,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gap: 8,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Row({
  title,
  value,
  meta,
  danger = false,
}: {
  title: string;
  value: string;
  meta: string;
  danger?: boolean;
}) {
  return (
    <div style={rowStyle}>
      <div>
        <strong>
          {title}
        </strong>
        <small
          style={{
            display: "block",
            color: "#64748b",
            marginTop: 3,
          }}
        >
          {meta}
        </small>
      </div>
      <b
        style={{
          color: danger
            ? "#b91c1c"
            : "#0f2d4a",
        }}
      >
        {value}
      </b>
    </div>
  );
}

const headStyle: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const periodRow: React.CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
  margin: "18px 0",
};

const periodButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 36,
  borderRadius: 999,
  border:
    "1px solid #cbd5e1",
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

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(175px,1fr))",
  gap: 10,
  marginBottom: 16,
};

const statStyle: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 4,
};

const twoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(340px,1fr))",
  gap: 16,
};

const panelStyle: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 10,
  alignItems: "center",
  border:
    "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "#f8fafc",
};

const secondaryAction: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 40,
  borderRadius: 10,
  border:
    "1px solid #cbd5e1",
  background: "white",
  color: "#0f2d4a",
  textDecoration: "none",
  padding: "0 13px",
  fontWeight: 900,
};

const warningStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 15,
  background: "#fff7ed",
  border:
    "1px solid #fed7aa",
  borderRadius: 14,
  color: "#9a3412",
  lineHeight: 1.8,
};
