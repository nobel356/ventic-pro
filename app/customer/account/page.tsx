import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/customer-auth";
import CustomerLogout from "./CustomerLogout";

const statusLabels: Record<string, string> = {
  NEW: "جديد",
  CONFIRMED: "تم التأكيد",
  ASSIGNED: "تم تعيين فني",
  ON_THE_WAY: "الفني في الطريق",
  ARRIVED: "وصل الفني",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

export default async function CustomerAccountPage() {
  const customer = await currentCustomer();

  if (!customer) {
    redirect("/customer/login");
  }

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    include: {
      invoice: true,
      technician: {
        select: { name: true },
      },
      warranties: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const invoices = orders
    .map((order) => order.invoice)
    .filter(Boolean);

  const due = invoices.reduce(
    (sum, invoice) => sum + Number(invoice?.due || 0),
    0,
  );

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f5f8fb",
        padding: "24px 16px 70px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <Link
            href="/"
            className="brand"
            style={{ textDecoration: "none" }}
          >
            <i>V</i> Ventic Pro
          </Link>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link className="button mini" href="/order">
              طلب جديد
            </Link>
            <CustomerLogout />
          </div>
        </header>

        <section style={heroStyle}>
          <div>
            <span style={{ color: "#64748b" }}>أهلاً بك</span>
            <h1 style={{ margin: "4px 0 6px" }}>{customer.name}</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              {customer.phone} — كل طلباتك وفواتيرك مرتبطة بنفس الحساب.
            </p>
          </div>

          <div style={statsStyle}>
            <Stat label="الطلبات" value={orders.length} />
            <Stat label="الفواتير" value={invoices.length} />
            <Stat label="إجمالي المتبقي" value={`${money(due)} ج`} danger={due > 0} />
          </div>
        </section>

        <section style={{ marginTop: 22 }}>
          <h2>طلباتي</h2>

          {orders.length === 0 ? (
            <div style={cardStyle}>
              لا توجد طلبات على هذا الحساب حتى الآن.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {orders.map((order) => {
                const warranty = order.warranties[0] || null;

                return (
                  <article key={order.id} style={cardStyle}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#0f2d4a", fontSize: 18 }}>
                          {order.orderNo}
                        </strong>
                        <p style={{ margin: "5px 0", color: "#64748b" }}>
                          {order.governorate || "-"} — {order.area || "-"}
                        </p>
                      </div>

                      <span style={statusStyle}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>

                    <div style={detailsGridStyle}>
                      <Detail label="الموعد" value={`${order.preferredDate || "-"} — ${order.preferredTime || "-"}`} />
                      <Detail label="الفني" value={order.technician?.name || "لم يتم التعيين"} />
                      <Detail
                        label="الفاتورة"
                        value={
                          order.invoice
                            ? `${money(order.invoice.total)} ج`
                            : "تظهر تلقائيًا بعد اعتماد المقايسة"
                        }
                      />
                      <Detail
                        label="المتبقي"
                        value={order.invoice ? `${money(order.invoice.due)} ج` : "-"}
                      />
                      <Detail
                        label="الضمان"
                        value={
                          warranty
                            ? `حتى ${warranty.endsAt.toLocaleDateString("ar-EG")}`
                            : order.status === "COMPLETED"
                              ? "قيد المراجعة"
                              : "يبدأ بعد إتمام التركيب"
                        }
                      />
                    </div>

                    {order.invoice && (
                      <div style={{ marginTop: 12 }}>
                        <Link
                          href={`/customer/account/invoices/${order.invoice.id}`}
                          style={{
                            textDecoration: "none",
                            fontWeight: 900,
                            color: "#075985",
                          }}
                        >
                          فتح الفاتورة ←
                        </Link>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
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
      <b style={{ fontSize: 22, color: danger ? "#b91c1c" : "#0f2d4a" }}>
        {value}
      </b>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small style={{ color: "#64748b" }}>{label}</small>
      <strong style={{ display: "block", marginTop: 3, color: "#0f2d4a" }}>
        {value}
      </strong>
    </div>
  );
}

const heroStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(15,23,42,.05)",
};

const statsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3,minmax(120px,1fr))",
  gap: 8,
};

const statStyle: React.CSSProperties = {
  minWidth: 120,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 11,
  background: "#f8fafc",
  display: "grid",
  gap: 3,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 6px 20px rgba(15,23,42,.04)",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
  gap: 12,
  marginTop: 14,
};

const statusStyle: React.CSSProperties = {
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1e3a8a",
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
};
