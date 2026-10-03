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

  // Self-heal old accepted quotations that existed before automatic invoice generation.
  const missingInvoices = await prisma.order.findMany({
    where: {
      invoice: { is: null },
      OR: [
        {
          venticEstimates: {
            some: { status: "ACCEPTED" },
          },
        },
        {
          quotes: {
            some: { status: "ACCEPTED" },
          },
        },
      ],
    },
    select: {
      id: true,
      orderNo: true,
    },
    take: 50,
    orderBy: { createdAt: "asc" },
  });

  for (const order of missingInvoices) {
    try {
      const synced = await prisma.$transaction(async (tx) => {
        const result = await syncOrderInvoice(tx, order.id);

        await tx.auditLog.create({
          data: {
            orderId: order.id,
            actorId: user.id,
            actorLabel: user.name,
            action: "ACCOUNTING_INVOICE_AUTO_CREATED",
            newValue: {
              invoiceId: result.invoice.id,
              invoiceNo: result.invoice.invoiceNo,
              total: result.financials.total,
              reason: "Backfill accepted quotation",
            },
          },
        });

        return result;
      });

      void synced;
    } catch {
      // A malformed legacy record should not prevent the accounting page from opening.
    }
  }

  const invoices = await prisma.invoice.findMany({
    include: {
      order: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
    take: 300,
  });

  const total = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total),
    0,
  );
  const paid = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.paid),
    0,
  );
  const due = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.due),
    0,
  );

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ marginBottom: 6 }}>الحسابات والفواتير</h1>
          <p style={{ color: "#64748b", margin: 0 }}>
            الفاتورة تتولد تلقائيًا عند اعتماد مقايسة Ventic Pro، وتظهر في الحسابات وفي حساب العميل بنفس اللحظة.
          </p>
        </div>

        <div style={statsGridStyle}>
          <Stat label="عدد الفواتير" value={invoices.length} />
          <Stat label="إجمالي الفواتير" value={`${money(total)} ج`} />
          <Stat label="إجمالي المحصل" value={`${money(paid)} ج`} />
          <Stat label="إجمالي المتبقي" value={`${money(due)} ج`} danger={due > 0} />
        </div>

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>سجل الفواتير</h2>
              <p style={{ color: "#64748b", marginBottom: 0 }}>
                أي دفعة أو إضافة معتمدة تحدث نفس الفاتورة تلقائيًا بدون إنشاء نسخة منفصلة يدويًا.
              </p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <p>لا توجد فواتير حتى الآن.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 950 }}>
                <thead>
                  <tr>
                    <th>رقم الفاتورة</th>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>تاريخ الإصدار</th>
                    <th>الإجمالي</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const isPaid = Number(invoice.due) <= 0.009;

                    return (
                      <tr key={invoice.id}>
                        <td>
                          <strong>{invoice.invoiceNo}</strong>
                        </td>
                        <td>{invoice.order.orderNo}</td>
                        <td>
                          {invoice.order.customer.name}
                          <small style={{ display: "block", color: "#64748b" }}>
                            {invoice.order.customer.phone}
                          </small>
                        </td>
                        <td>{invoice.issuedAt.toLocaleDateString("ar-EG")}</td>
                        <td>{money(invoice.total)} ج</td>
                        <td>{money(invoice.paid)} ج</td>
                        <td>
                          <strong style={{ color: isPaid ? "#166534" : "#b91c1c" }}>
                            {money(invoice.due)} ج
                          </strong>
                        </td>
                        <td>
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "5px 9px",
                              fontSize: 12,
                              fontWeight: 900,
                              background: isPaid ? "#dcfce7" : "#fff7ed",
                              color: isPaid ? "#166534" : "#9a3412",
                            }}
                          >
                            {isPaid ? "مسددة" : "متبقي"}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/admin/orders/${invoice.orderId}#financials`}
                            style={{ fontWeight: 900, color: "#075985" }}
                          >
                            فتح الطلب
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
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
          color: danger ? "#b91c1c" : "#0f2d4a",
        }}
      >
        {value}
      </b>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
    </div>
  );
}

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
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
  boxShadow: "0 6px 20px rgba(15,23,42,.04)",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,.05)",
};
