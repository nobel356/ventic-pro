import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import { syncOrderInvoice } from "@/lib/order-financials";

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

export default async function AccountingPage() {
  const user = await currentUser();

  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.ACCOUNTING_VIEW,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  const missingInvoices =
    await prisma.order.findMany({
      where: {
        invoice: { is: null },
        OR: [
          {
            venticEstimates: {
              some: {
                status: "ACCEPTED",
              },
            },
          },
          {
            quotes: {
              some: {
                status: "ACCEPTED",
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
      take: 50,
      orderBy: {
        createdAt: "asc",
      },
    });

  for (const order of missingInvoices) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const result =
            await syncOrderInvoice(
              tx,
              order.id,
            );

          await tx.auditLog.create({
            data: {
              orderId: order.id,
              actorId: user.id,
              actorLabel: user.name,
              action:
                "ACCOUNTING_INVOICE_AUTO_CREATED",
              newValue: {
                invoiceId:
                  result.invoice.id,
                invoiceNo:
                  result.invoice
                    .invoiceNo,
                total:
                  result.financials
                    .total,
                reason:
                  "Backfill accepted quotation",
              },
            },
          });
        },
      );
    } catch {
      // Keep accounting available even if a malformed legacy order cannot be synchronized.
    }
  }

  const canViewCost = can(
    user.role,
    PERMISSIONS.INVENTORY_COST_VIEW,
    user.permissions,
  );

  const [
    invoices,
    purchaseAggregate,
    inventoryItems,
  ] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: {
        issuedAt: "desc",
      },
      take: 300,
    }),
    canViewCost
      ? prisma.purchaseReceipt.aggregate({
          where: {
            status: "RECEIVED",
          },
          _sum: {
            total: true,
          },
          _count: true,
        })
      : Promise.resolve(null),
    canViewCost
      ? prisma.inventoryItem.findMany({
          select: {
            quantity: true,
            averageUnitCost: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const total = invoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.total),
    0,
  );
  const paid = invoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.paid),
    0,
  );
  const due = invoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.due),
    0,
  );

  const purchasesTotal = canViewCost
    ? Number(
        purchaseAggregate?._sum
          .total || 0,
      )
    : null;

  const stockValue = canViewCost
    ? inventoryItems.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity) *
            Number(
              item.averageUnitCost,
            ),
        0,
      )
    : null;

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding:
            "26px 18px 70px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                marginBottom: 6,
              }}
            >
              الحسابات والفواتير
            </h1>
            <p
              style={{
                color: "#64748b",
                margin: 0,
              }}
            >
              الفاتورة تتولد من المقايسة المعتمدة وتحدث تلقائيًا مع المدفوعات والإضافات.
            </p>
          </div>

          {can(
            user.role,
            PERMISSIONS.EXPORTS_VIEW,
            user.permissions,
          ) && (
            <Link
              href="/admin/exports"
              style={actionLinkStyle}
            >
              مركز Excel
            </Link>
          )}
        </div>

        <div style={statsGridStyle}>
          <Stat
            label="عدد الفواتير"
            value={invoices.length}
          />
          <Stat
            label="إجمالي الفواتير"
            value={`${money(total)} ج`}
          />
          <Stat
            label="إجمالي المحصل"
            value={`${money(paid)} ج`}
          />
          <Stat
            label="إجمالي المتبقي"
            value={`${money(due)} ج`}
            danger={due > 0}
          />
          {canViewCost && (
            <Stat
              label="إجمالي التوريدات المسجلة"
              value={`${money(
                purchasesTotal,
              )} ج`}
            />
          )}
          {canViewCost && (
            <Stat
              label="قيمة رصيد مخزن الشركة"
              value={`${money(
                stockValue,
              )} ج`}
            />
          )}
        </div>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>
            سجل الفواتير
          </h2>
          <p
            style={{
              color: "#64748b",
            }}
          >
            نفس الفاتورة تظهر في حساب العميل وتظل مرتبطة بالأوردر والمدفوعات.
          </p>

          {invoices.length === 0 ? (
            <p>
              لا توجد فواتير حتى الآن.
            </p>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 950,
                }}
              >
                <thead>
                  <tr>
                    <th>
                      رقم الفاتورة
                    </th>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>
                      تاريخ الإصدار
                    </th>
                    <th>الإجمالي</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(
                    (invoice) => {
                      const isPaid =
                        Number(
                          invoice.due,
                        ) <= 0.009;

                      return (
                        <tr
                          key={invoice.id}
                        >
                          <td>
                            <strong>
                              {
                                invoice.invoiceNo
                              }
                            </strong>
                          </td>
                          <td>
                            {
                              invoice.order
                                .orderNo
                            }
                          </td>
                          <td>
                            {
                              invoice.order
                                .customer
                                .name
                            }
                            <small
                              style={{
                                display:
                                  "block",
                                color:
                                  "#64748b",
                              }}
                            >
                              {
                                invoice.order
                                  .customer
                                  .phone
                              }
                            </small>
                          </td>
                          <td>
                            {invoice.issuedAt.toLocaleDateString(
                              "ar-EG",
                            )}
                          </td>
                          <td>
                            {money(
                              invoice.total,
                            )}{" "}
                            ج
                          </td>
                          <td>
                            {money(
                              invoice.paid,
                            )}{" "}
                            ج
                          </td>
                          <td>
                            <strong
                              style={{
                                color:
                                  isPaid
                                    ? "#166534"
                                    : "#b91c1c",
                              }}
                            >
                              {money(
                                invoice.due,
                              )}{" "}
                              ج
                            </strong>
                          </td>
                          <td>
                            {isPaid
                              ? "مسددة"
                              : "متبقي"}
                          </td>
                          <td>
                            <Link
                              href={`/admin/orders/${invoice.orderId}#financials`}
                            >
                              فتح الطلب
                            </Link>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string | number;
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
    </div>
  );
}

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 12,
  marginBottom: 20,
};

const statStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  display: "grid",
  gap: 4,
  boxShadow:
    "0 6px 20px rgba(15,23,42,.04)",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  boxShadow:
    "0 8px 24px rgba(15,23,42,.05)",
};

const actionLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  minHeight: 42,
  borderRadius: 10,
  background: "#0f2d4a",
  color: "white",
  padding: "0 13px",
  fontWeight: 900,
};
