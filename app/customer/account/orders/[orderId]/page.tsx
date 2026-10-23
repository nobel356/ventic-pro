import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/customer-auth";

const statusLabels: Record<string, string> = {
  NEW: "تم استلام الطلب",
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

export default async function CustomerOrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const customer = await currentCustomer();
  if (!customer) redirect("/customer/login");

  const { orderId } = await params;
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: customer.id,
      archivedAt: null,
    },
    include: {
      technician: { select: { name: true } },
      invoice: true,
      warranties: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      spaces: {
        include: { services: true },
      },
    },
  });

  if (!order) notFound();

  const warranty = order.warranties[0] || null;

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f5f8fb",
        padding: "70px 16px 80px",
      }}
    >
      <section style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/customer/account" style={backLink}>
          ← حسابي
        </Link>

        <div style={heroStyle}>
          <div>
            <span style={{ color: "#64748b" }}>تفاصيل الطلب</span>
            <h1 style={{ color: "#071a2b", margin: "5px 0" }}>
              {order.orderNo}
            </h1>
            <p style={{ color: "#64748b", margin: 0 }}>
              {order.governorate || "-"} — {order.area || "-"}
            </p>
          </div>

          <span style={statusStyle}>
            {statusLabels[order.status] || order.status}
          </span>
        </div>

        <div style={gridStyle}>
          <Info label="الموعد" value={`${order.preferredDate || "-"} — ${order.preferredTime || "-"}`} />
          <Info label="الفني" value={order.technician?.name || "لم يتم التعيين"} />
          <Info label="السعر التقديري" value={`${money(order.estimatedTotal)} ج`} />
          <Info label="السعر النهائي" value={order.finalTotal ? `${money(order.finalTotal)} ج` : "لم يعتمد بعد"} />
        </div>

        <section style={cardStyle}>
          <h2 style={{ color: "#0b2f49", marginTop: 0 }}>الخدمات</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {order.spaces.flatMap((space) =>
              space.services.map((service) => (
                <div key={service.id} style={serviceRow}>
                  <span>
                    <b>{space.label}</b> — {service.serviceNameSnapshot}
                  </span>
                  <span style={{ color: "#64748b" }}>
                    {Number(service.qty)} × {money(service.unitPriceSnapshot)} ج
                  </span>
                </div>
              )),
            )}
          </div>
        </section>

        <section style={{ ...cardStyle, marginTop: 14 }}>
          <h2 style={{ color: "#0b2f49", marginTop: 0 }}>المستندات والمتابعة</h2>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {order.invoice && (
              <Link
                href={`/customer/account/invoices/${order.invoice.id}`}
                style={actionLink}
              >
                🧾 الفاتورة
              </Link>
            )}

            {warranty && (
              <Link
                href={`/customer/account/warranty/${order.id}`}
                style={actionLink}
              >
                🛡️ شهادة الضمان
              </Link>
            )}

            {order.status === "COMPLETED" && (
              <Link href="/customer/account/aftercare" style={actionLink}>
                🛠️ ما بعد التركيب
              </Link>
            )}
          </div>

          <p style={{ color: "#64748b", lineHeight: 1.8, marginBottom: 0 }}>
            زر QR الظاهر في الصفحة يفتح هذا الطلب مباشرة بعد تسجيل دخول العميل.
          </p>
        </section>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={cardStyle}>
      <small style={{ color: "#64748b" }}>{label}</small>
      <strong style={{ display: "block", color: "#0b2f49", marginTop: 4 }}>
        {value}
      </strong>
    </div>
  );
}

const backLink: React.CSSProperties = {
  display: "inline-block",
  color: "#075985",
  fontWeight: 900,
  textDecoration: "none",
  marginBottom: 12,
};

const heroStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 18,
  padding: 20,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const statusStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "7px 11px",
  background: "#eef8fd",
  color: "#075985",
  fontWeight: 900,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
  gap: 10,
  marginTop: 14,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 15,
  padding: 16,
};

const serviceRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  borderBottom: "1px solid #eef2f6",
  paddingBottom: 8,
};

const actionLink: React.CSSProperties = {
  textDecoration: "none",
  border: "1px solid #bae6fd",
  background: "#f0f9ff",
  color: "#075985",
  borderRadius: 10,
  padding: "9px 11px",
  fontWeight: 900,
};
