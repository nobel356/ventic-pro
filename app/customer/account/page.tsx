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

const timeline = [
  ["NEW", "استلام الطلب"],
  ["CONFIRMED", "تأكيد الطلب"],
  ["ASSIGNED", "تعيين الفني"],
  ["ON_THE_WAY", "في الطريق"],
  ["IN_PROGRESS", "التنفيذ"],
  ["COMPLETED", "تم التركيب"],
] as const;

const statusRank: Record<string, number> = {
  NEW: 0,
  CONFIRMED: 1,
  ASSIGNED: 2,
  ON_THE_WAY: 3,
  ARRIVED: 3,
  IN_PROGRESS: 4,
  COMPLETED: 5,
};

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

export default async function CustomerAccountPage() {
  const customer = await currentCustomer();
  if (!customer) redirect("/customer/login");

  const customerData = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: {
      properties: {
        include: {
          devices: {
            where: { active: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      orders: {
        where: {
          archivedAt: null,
        },
        include: {
          invoice: true,
          review: true,
          technician: { select: { name: true } },
          warranties: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          maintenanceRequests: {
            where: { status: { in: ["OPEN", "SCHEDULED", "IN_PROGRESS"] } },
          },
          complaints: {
            where: { status: { in: ["OPEN", "SCHEDULED", "IN_PROGRESS"] } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customerData) redirect("/customer/login");

  const invoices = customerData.orders.map((order) => order.invoice).filter(Boolean);
  const due = invoices.reduce((sum, invoice) => sum + Number(invoice?.due || 0), 0);
  const devices = customerData.properties.flatMap((property) => property.devices);
  const openAftercare = customerData.orders.reduce(
    (sum, order) => sum + order.maintenanceRequests.length + order.complaints.length,
    0,
  );

  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#f5f8fb", padding: "24px 16px 70px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={headerStyle}>
          <Link href="/" className="brand" style={{ textDecoration: "none" }}>
            <i>V</i> Ventic Pro
          </Link>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Link className="outline" href="/customer/account/aftercare">
              الصيانة وما بعد التركيب
            </Link>
            <Link className="button mini" href="/order">
              طلب جديد
            </Link>
            <CustomerLogout />
          </div>
        </header>

        <section style={heroStyle}>
          <div>
            <span style={{ color: "#64748b" }}>أهلاً بك</span>
            <h1 style={{ margin: "4px 0 6px" }}>{customerData.name}</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              {customerData.phone}
              {customerData.email ? ` — ${customerData.email}` : ""}
              {" — "}ملف واحد لكل طلباتك وعقاراتك وأجهزتك.
            </p>
          </div>

          <div style={statsStyle}>
            <Stat label="الطلبات" value={customerData.orders.length} />
            <Stat label="العقارات" value={customerData.properties.length} />
            <Stat label="الأجهزة" value={devices.length} />
            <Stat label="الفواتير" value={invoices.length} />
            <Stat label="المتبقي" value={`${money(due)} ج`} danger={due > 0} />
            <Stat label="متابعة مفتوحة" value={openAftercare} danger={openAftercare > 0} />
          </div>
        </section>

        {customerData.properties.length > 0 && (
          <section style={{ marginTop: 22 }}>
            <h2>عقاراتي وأجهزتي</h2>

            <div style={{ display: "grid", gap: 12 }}>
              {customerData.properties.map((property) => (
                <article key={property.id} style={cardStyle}>
                  <strong style={{ fontSize: 17 }}>{property.label || "عقار"}</strong>
                  <p style={{ color: "#64748b" }}>
                    {property.governorate} — {property.area} — {property.address}
                  </p>

                  {property.devices.length === 0 ? (
                    <small style={{ color: "#64748b" }}>
                      لا توجد أجهزة مسجلة على هذا العقار حتى الآن.
                    </small>
                  ) : (
                    <div style={deviceGridStyle}>
                      {property.devices.map((device) => (
                        <div key={device.id} style={deviceStyle}>
                          <b>{device.type}</b>
                          <span>
                            {[device.brand, device.model, device.size, device.location]
                              .filter(Boolean)
                              .join(" — ") || "تفاصيل التركيب"}
                          </span>
                          <small>
                            {device.warrantyEndsAt
                              ? `الضمان حتى ${device.warrantyEndsAt.toLocaleDateString("ar-EG")}`
                              : "تاريخ الضمان غير مسجل"}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginTop: 22 }}>
          <h2>طلباتي</h2>

          {customerData.orders.length === 0 ? (
            <div style={cardStyle}>لا توجد طلبات على هذا الحساب حتى الآن.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {customerData.orders.map((order) => {
                const warranty = order.warranties[0] || null;
                const openTickets = order.maintenanceRequests.length + order.complaints.length;
                const currentRank = statusRank[order.status] ?? -1;

                return (
                  <article key={order.id} style={cardStyle}>
                    <div style={orderHeadStyle}>
                      <div>
                        <strong style={{ color: "#0f2d4a", fontSize: 18 }}>
                          {order.orderNo}
                        </strong>
                        <p style={{ margin: "5px 0", color: "#64748b" }}>
                          {order.governorate || "-"} — {order.area || "-"}
                        </p>
                      </div>

                      <span
                        style={{
                          ...statusStyle,
                          ...(order.status === "CANCELLED"
                            ? { background: "#fef2f2", color: "#991b1b" }
                            : {}),
                        }}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>

                    {order.status !== "CANCELLED" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(6,minmax(86px,1fr))",
                          gap: 7,
                          overflowX: "auto",
                          paddingBottom: 6,
                          marginTop: 15,
                        }}
                      >
                        {timeline.map(([key, label], index) => {
                          const reached = currentRank >= index;

                          return (
                            <div
                              key={key}
                              style={{
                                minWidth: 86,
                                borderRadius: 10,
                                border: `1px solid ${reached ? "#bbf7d0" : "#e2e8f0"}`,
                                background: reached ? "#f0fdf4" : "#f8fafc",
                                padding: "8px 7px",
                                textAlign: "center",
                              }}
                            >
                              <span
                                style={{
                                  width: 24,
                                  height: 24,
                                  margin: "0 auto 5px",
                                  display: "grid",
                                  placeItems: "center",
                                  borderRadius: "50%",
                                  background: reached ? "#16a34a" : "#cbd5e1",
                                  color: "white",
                                  fontSize: 12,
                                  fontWeight: 900,
                                }}
                              >
                                {reached ? "✓" : index + 1}
                              </span>
                              <small
                                style={{
                                  color: reached ? "#166534" : "#64748b",
                                  fontWeight: 800,
                                }}
                              >
                                {label}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={detailsGridStyle}>
                      <Detail label="الموعد" value={`${order.preferredDate || "-"} — ${order.preferredTime || "-"}`} />
                      <Detail label="الفني" value={order.technician?.name || "لم يتم التعيين"} />
                      <Detail
                        label="الفاتورة"
                        value={order.invoice ? `${money(order.invoice.total)} ج` : "تظهر تلقائيًا بعد اعتماد المقايسة"}
                      />
                      <Detail label="المتبقي" value={order.invoice ? `${money(order.invoice.due)} ج` : "-"} />
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
                      <Detail
                        label="متابعة ما بعد التركيب"
                        value={openTickets ? `${openTickets} طلب مفتوح` : "لا توجد"}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                      {order.invoice && (
                        <Link href={`/customer/account/invoices/${order.invoice.id}`} style={actionLink}>
                          🧾 الفاتورة / PDF
                        </Link>
                      )}

                      {warranty && (
                        <Link
                          href={`/customer/account/warranty/${order.id}`}
                          style={warrantyLinkStyle}
                        >
                          🛡️ شهادة الضمان / PDF
                        </Link>
                      )}

                      {order.status === "COMPLETED" && (
                        <Link href="/customer/account/aftercare" style={actionLink}>
                          🛠️ طلب صيانة / شكوى
                        </Link>
                      )}

                      {order.status === "COMPLETED" && !order.review && (
                        <Link href={`/customer/review/${order.id}`} style={reviewLinkStyle}>
                          ⭐ قيّم الخدمة
                        </Link>
                      )}

                      {order.review && (
                        <span style={{ color: "#166534", fontWeight: 900, padding: "8px 0" }}>
                          ✓ تم تقييم الخدمة
                        </span>
                      )}
                    </div>
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

function Stat({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div style={statStyle}>
      <b style={{ fontSize: 20, color: danger ? "#b91c1c" : "#0f2d4a" }}>{value}</b>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small style={{ color: "#64748b" }}>{label}</small>
      <strong style={{ display: "block", marginTop: 3, color: "#0f2d4a" }}>{value}</strong>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 22,
};

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
  gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
  gap: 8,
};

const statStyle: React.CSSProperties = {
  minWidth: 110,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 10,
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

const deviceGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: 8,
};

const deviceStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "#f8fafc",
};

const orderHeadStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
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

const actionLink: React.CSSProperties = {
  textDecoration: "none",
  fontWeight: 900,
  color: "#075985",
  background: "#f0f9ff",
  border: "1px solid #bae6fd",
  borderRadius: 9,
  padding: "8px 10px",
};

const warrantyLinkStyle: React.CSSProperties = {
  ...actionLink,
  color: "#166534",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
};

const reviewLinkStyle: React.CSSProperties = {
  ...actionLink,
  color: "#b45309",
  background: "#fffbeb",
  border: "1px solid #fde68a",
};
