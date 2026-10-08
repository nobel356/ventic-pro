import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import { technicianBalanceMap } from "@/lib/inventory-balances";

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

export default async function TechnicianPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.TECHNICIAN_PERFORMANCE_VIEW,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  const { id } = await params;

  const technician = await prisma.user.findFirst({
    where: {
      id,
      role: "TECHNICIAN",
    },
    include: {
      assignedOrders: {
        where: {
          archivedAt: null,
        },
        select: {
          id: true,
          orderNo: true,
          status: true,
          createdAt: true,
          customer: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      technicianReviews: {
        where: {
          order: {
            archivedAt: null,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      maintenanceAssignments: {
        where: {
          order: {
            archivedAt: null,
          },
        },
        select: {
          id: true,
          status: true,
          issue: true,
          appointmentAt: true,
          createdAt: true,
          order: {
            select: { orderNo: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      complaintAssignments: {
        where: {
          order: {
            archivedAt: null,
          },
        },
        select: {
          id: true,
          status: true,
          issue: true,
          freeRevisit: true,
          revisitAt: true,
          createdAt: true,
          order: {
            select: { orderNo: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      receivedPayments: {
        where: {
          order: {
            archivedAt: null,
          },
        },
        select: {
          amount: true,
          status: true,
        },
      },
    },
  });

  if (!technician) notFound();

  const completed = technician.assignedOrders.filter(
    (order) => order.status === "COMPLETED",
  ).length;

  const reviews = technician.technicianReviews;
  const overall = avg(reviews.map((review) => review.overall));
  const punctuality = avg(reviews.map((review) => review.punctuality));
  const professionalism = avg(
    reviews.map((review) => review.professionalism),
  );
  const complaints = technician.complaintAssignments.length;
  const freeRevisits = technician.complaintAssignments.filter(
    (item) => item.freeRevisit,
  ).length;
  const maintenance = technician.maintenanceAssignments.length;
  const collected = technician.receivedPayments
    .filter((payment) => payment.status === "PAID")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const balances = await technicianBalanceMap(prisma);
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { active: true },
    select: {
      id: true,
      sku: true,
      nameAr: true,
      unit: true,
    },
    orderBy: { nameAr: "asc" },
  });

  const custody = inventoryItems
    .map((item) => ({
      ...item,
      quantity: balances.get(`${technician.id}:${item.id}`) || 0,
    }))
    .filter((item) => Math.abs(item.quantity) > 0.000001);

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1350,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <Link href="/admin/technicians">← الفنيون</Link>

        <div style={heroStyle}>
          <div>
            <h1 style={{ margin: "0 0 6px" }}>{technician.name}</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              {technician.email} — {technician.phone || "بدون هاتف"} —{" "}
              {technician.active ? "نشط" : "موقوف"}
            </p>
          </div>

          <div style={statsStyle}>
            <Stat label="طلبات مسندة" value={technician.assignedOrders.length} />
            <Stat label="تركيبات مكتملة" value={completed} />
            <Stat label="متوسط التقييم" value={reviews.length ? `${overall.toFixed(1)}/5` : "-"} />
            <Stat label="الالتزام بالمواعيد" value={reviews.length ? `${punctuality.toFixed(1)}/5` : "-"} />
            <Stat label="الشكاوى" value={complaints} danger={complaints > 0} />
            <Stat label="إعادة زيارة مجانية" value={freeRevisits} danger={freeRevisits > 0} />
            <Stat label="طلبات صيانة" value={maintenance} />
            <Stat label="تحصيلات مسجلة" value={`${money(collected)} ج`} />
          </div>
        </div>

        <p style={noticeStyle}>
          مؤشرات الأداء تُقرأ معًا ولا يتم ترتيب الفنيين بناءً على رقم واحد فقط؛
          التقييم، الالتزام، الشكاوى وإعادة الزيارة كلها سياق واحد.
        </p>

        <div style={twoColStyle}>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>تفاصيل التقييمات</h2>
            <div style={statsStyle}>
              <Stat
                label="الاحترافية"
                value={reviews.length ? professionalism.toFixed(1) : "-"}
              />
              <Stat
                label="جودة التركيب"
                value={
                  reviews.length
                    ? avg(
                        reviews.map(
                          (review) => review.installationQuality,
                        ),
                      ).toFixed(1)
                    : "-"
                }
              />
              <Stat
                label="النظافة"
                value={
                  reviews.length
                    ? avg(
                        reviews.map((review) => review.cleanliness),
                      ).toFixed(1)
                    : "-"
                }
              />
              <Stat
                label="التواصل"
                value={
                  reviews.length
                    ? avg(
                        reviews.map((review) => review.communication),
                      ).toFixed(1)
                    : "-"
                }
              />
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              {reviews.slice(0, 8).map((review) => (
                <div key={review.id} style={rowStyle}>
                  <strong>{review.overall}/5</strong>
                  <span>{review.comment || "بدون تعليق"}</span>
                  <small>{review.createdAt.toLocaleDateString("ar-EG")}</small>
                </div>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>عهدة الفني الحالية</h2>
            {custody.length === 0 ? (
              <p>لا توجد خامات بعهدة الفني.</p>
            ) : (
              <div style={{ display: "grid", gap: 7 }}>
                {custody.map((item) => (
                  <div key={item.id} style={rowStyle}>
                    <strong>{item.sku}</strong>
                    <span>{item.nameAr}</span>
                    <b>
                      {item.quantity.toLocaleString("ar-EG")} {item.unit}
                    </b>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section style={{ ...cardStyle, marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>آخر الطلبات</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 650 }}>
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>العميل</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {technician.assignedOrders.slice(0, 15).map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNo}</td>
                    <td>{order.customer.name}</td>
                    <td>{order.status}</td>
                    <td>{order.createdAt.toLocaleDateString("ar-EG")}</td>
                    <td>
                      <Link href={`/admin/orders/${order.id}`}>فتح</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      <b style={{ fontSize: 20, color: danger ? "#b91c1c" : "#0f2d4a" }}>
        {value}
      </b>
      <small style={{ color: "#64748b" }}>{label}</small>
    </div>
  );
}

const heroStyle: React.CSSProperties = {
  marginTop: 12,
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  display: "grid",
  gap: 16,
};

const statsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
  gap: 8,
};

const statStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 11,
  padding: 10,
  background: "#f8fafc",
  display: "grid",
  gap: 3,
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
  gap: 16,
  marginTop: 16,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto minmax(160px,1fr) auto",
  gap: 10,
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "#f8fafc",
};

const noticeStyle: React.CSSProperties = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  borderRadius: 12,
  padding: 11,
  lineHeight: 1.6,
  marginTop: 14,
};
