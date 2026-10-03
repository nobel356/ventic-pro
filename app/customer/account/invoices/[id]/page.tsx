import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/customer-auth";
import PrintInvoiceButton from "./PrintInvoiceButton";

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function CustomerInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const customer = await currentCustomer();

  if (!customer) redirect("/customer/login");

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      order: {
        customerId: customer.id,
      },
    },
    include: {
      order: {
        include: {
          customer: true,
          venticEstimates: {
            where: { status: "ACCEPTED" },
            include: {
              items: {
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { version: "desc" },
            take: 1,
          },
          extraCharges: {
            where: { status: "APPROVED" },
            orderBy: { createdAt: "asc" },
          },
          payments: {
            where: { status: "PAID" },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!invoice) notFound();

  const estimate = invoice.order.venticEstimates[0] || null;

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f5f8fb",
        padding: "24px 16px 70px",
      }}
    >
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 10px 30px rgba(15,23,42,.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div>
            <Link
              href="/customer/account"
              className="brand"
              style={{ textDecoration: "none" }}
            >
              <i>V</i> Ventic Pro
            </Link>
            <h1 style={{ marginBottom: 5 }}>فاتورة العميل</h1>
            <p style={{ color: "#64748b", marginTop: 0 }}>
              {invoice.invoiceNo}
            </p>
          </div>

          <PrintInvoiceButton />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
            gap: 12,
            margin: "20px 0",
          }}
        >
          <Info label="العميل" value={invoice.order.customer.name} />
          <Info label="رقم الموبايل" value={invoice.order.customer.phone} />
          <Info label="رقم الطلب" value={invoice.order.orderNo} />
          <Info
            label="تاريخ إصدار الفاتورة"
            value={invoice.issuedAt.toLocaleDateString("ar-EG")}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 650 }}>
            <thead>
              <tr>
                <th>البيان</th>
                <th>الكمية</th>
                <th>الوحدة</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {estimate?.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{Number(item.qty)}</td>
                  <td>{item.unit}</td>
                  <td>{money(item.unitPrice)} ج</td>
                  <td>{money(Number(item.qty) * Number(item.unitPrice))} ج</td>
                </tr>
              ))}

              {invoice.order.extraCharges.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.title}
                    <small style={{ display: "block", color: "#64748b" }}>
                      {item.reason}
                    </small>
                  </td>
                  <td>1</td>
                  <td>إضافة</td>
                  <td>{money(item.amount)} ج</td>
                  <td>{money(item.amount)} ج</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            maxWidth: 430,
            marginRight: "auto",
            marginTop: 20,
            display: "grid",
            gap: 8,
          }}
        >
          <Total label="الإجمالي قبل الخصم" value={invoice.subtotal} />
          <Total label="الخصم" value={invoice.discount} />
          <Total label="إجمالي الفاتورة" value={invoice.total} strong />
          <Total label="المدفوع" value={invoice.paid} />
          <Total label="المتبقي" value={invoice.due} strong danger={Number(invoice.due) > 0} />
        </div>

        {invoice.order.payments.length > 0 && (
          <>
            <h2 style={{ marginTop: 26 }}>المدفوعات</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {invoice.order.payments.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span>{payment.createdAt.toLocaleDateString("ar-EG")}</span>
                  <strong>{money(payment.amount)} ج</strong>
                  <span>{payment.method}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p
          style={{
            marginTop: 24,
            color: "#64748b",
            borderTop: "1px solid #e2e8f0",
            paddingTop: 14,
          }}
        >
          تم إنشاء هذه الفاتورة تلقائيًا من مقايسة Ventic Pro المعتمدة والإضافات التي وافق عليها العميل.
        </p>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small style={{ color: "#64748b" }}>{label}</small>
      <strong style={{ display: "block", marginTop: 3, color: "#0f2d4a" }}>
        {value}
      </strong>
    </div>
  );
}

function Total({
  label,
  value,
  strong = false,
  danger = false,
}: {
  label: string;
  value: unknown;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: "1px solid #e2e8f0",
        paddingBottom: 7,
      }}
    >
      <span>{label}</span>
      <b
        style={{
          fontSize: strong ? 18 : 15,
          color: danger ? "#b91c1c" : "#0f2d4a",
        }}
      >
        {money(value)} ج
      </b>
    </div>
  );
}
