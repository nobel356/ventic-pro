import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

export default async function ReportsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.REPORTS_VIEW,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalOrders,
    completedOrders,
    cancelledOrders,
    recentOrders,
    revenueAgg,
    dueAgg,
    reviews,
    openComplaints,
    openMaintenance,
    lowStockRaw,
    services,
    areas,
    technicians,
    leads,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.order.count({ where: { createdAt: { gte: since30 } } }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      _sum: { due: true, total: true },
    }),
    prisma.review.aggregate({
      _avg: {
        overall: true,
        punctuality: true,
        professionalism: true,
        installationQuality: true,
        cleanliness: true,
        communication: true,
        valueForMoney: true,
      },
      _count: true,
    }),
    prisma.complaint.count({
      where: {
        status: { in: ["OPEN", "SCHEDULED", "IN_PROGRESS"] },
      },
    }),
    prisma.maintenanceRequest.count({
      where: {
        status: { in: ["OPEN", "SCHEDULED", "IN_PROGRESS"] },
      },
    }),
    prisma.inventoryItem.findMany({
      where: { active: true },
      select: {
        id: true,
        sku: true,
        nameAr: true,
        quantity: true,
        reorderLevel: true,
      },
      orderBy: { nameAr: "asc" },
    }),
    prisma.orderService.groupBy({
      by: ["serviceCodeSnapshot", "serviceNameSnapshot"],
      _sum: { qty: true },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["governorate", "area"],
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: {
        role: "TECHNICIAN",
        active: true,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            assignedOrders: true,
            complaintAssignments: true,
            maintenanceAssignments: true,
          },
        },
        technicianReviews: {
          select: { overall: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.lead.groupBy({
      by: ["source", "status"],
      _count: true,
    }),
  ]);

  const lowStock = lowStockRaw.filter(
    (item) => Number(item.quantity) <= Number(item.reorderLevel),
  );

  const topServices = [...services]
    .sort(
      (a, b) =>
        b._count._all - a._count._all,
    )
    .slice(0, 8);

  const topAreas = [...areas]
    .sort(
      (a, b) =>
        b._count._all - a._count._all,
    )
    .slice(0, 8);

  const revenue = Number(revenueAgg._sum.amount || 0);
  const invoiceTotal = Number(dueAgg._sum.total || 0);
  const due = Number(dueAgg._sum.due || 0);
  const completionRate = totalOrders
    ? (completedOrders / totalOrders) * 100
    : 0;
  const cancellationRate = totalOrders
    ? (cancelledOrders / totalOrders) * 100
    : 0;

  const techRows = technicians
    .map((tech) => {
      const rating = tech.technicianReviews.length
        ? tech.technicianReviews.reduce(
            (sum, review) => sum + review.overall,
            0,
          ) / tech.technicianReviews.length
        : 0;

      return {
        ...tech,
        rating,
      };
    })
    .sort(
      (a, b) =>
        b._count.assignedOrders - a._count.assignedOrders,
    );

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1450,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <div style={headStyle}>
          <div>
            <h1 style={{ marginBottom: 6 }}>التقارير والإحصائيات</h1>
            <p style={{ marginTop: 0, color: "#64748b" }}>
              لوحة واحدة للتشغيل والتحصيل والجودة والمخزون والمناطق والفنيين.
            </p>
          </div>

          {can(
            user.role,
            PERMISSIONS.EXPORTS_VIEW,
            user.permissions,
          ) && (
            <Link href="/admin/exports" style={actionStyle}>
              مركز Excel
            </Link>
          )}
        </div>

        <div style={statsStyle}>
          <Stat label="إجمالي الطلبات" value={totalOrders} />
          <Stat label="طلبات آخر 30 يوم" value={recentOrders} />
          <Stat label="معدل الإتمام" value={`${completionRate.toFixed(1)}%`} />
          <Stat label="معدل الإلغاء" value={`${cancellationRate.toFixed(1)}%`} danger={cancellationRate > 15} />
          <Stat label="إجمالي المحصل" value={`${money(revenue)} ج`} />
          <Stat label="إجمالي الفواتير" value={`${money(invoiceTotal)} ج`} />
          <Stat label="المتبقي" value={`${money(due)} ج`} danger={due > 0} />
          <Stat
            label="متوسط التقييم"
            value={reviews._count ? `${Number(reviews._avg.overall || 0).toFixed(1)}/5` : "-"}
          />
          <Stat label="شكاوى مفتوحة" value={openComplaints} danger={openComplaints > 0} />
          <Stat label="صيانة مفتوحة" value={openMaintenance} danger={openMaintenance > 0} />
          <Stat label="أصناف تحت الحد" value={lowStock.length} danger={lowStock.length > 0} />
        </div>

        <div style={twoColStyle}>
          <Panel title="جودة الخدمة">
            <Metric label="الالتزام بالمواعيد" value={reviews._avg.punctuality} />
            <Metric label="احترافية الفني" value={reviews._avg.professionalism} />
            <Metric label="جودة التركيب" value={reviews._avg.installationQuality} />
            <Metric label="النظافة" value={reviews._avg.cleanliness} />
            <Metric label="التواصل" value={reviews._avg.communication} />
            <Metric label="القيمة مقابل السعر" value={reviews._avg.valueForMoney} />
          </Panel>

          <Panel title="الخدمات الأكثر طلبًا">
            {topServices.length === 0 ? (
              <p>لا توجد بيانات.</p>
            ) : (
              topServices.map((item) => (
                <Row
                  key={`${item.serviceCodeSnapshot}:${item.serviceNameSnapshot}`}
                  title={item.serviceNameSnapshot}
                  value={`${Number(item._sum.qty || 0).toLocaleString("ar-EG")} وحدة`}
                  meta={item.serviceCodeSnapshot}
                />
              ))
            )}
          </Panel>

          <Panel title="أكثر المناطق نشاطًا">
            {topAreas.length === 0 ? (
              <p>لا توجد بيانات.</p>
            ) : (
              topAreas.map((item, index) => (
                <Row
                  key={`${item.governorate}:${item.area}:${index}`}
                  title={`${item.governorate || "-"} — ${item.area || "-"}`}
                  value={`${item._count._all} طلب`}
                />
              ))
            )}
          </Panel>

          <Panel title="الفنيون — مؤشرات تشغيلية">
            {techRows.length === 0 ? (
              <p>لا يوجد فنيون نشطون.</p>
            ) : (
              techRows.slice(0, 8).map((tech) => (
                <Row
                  key={tech.id}
                  title={tech.name}
                  value={`${tech._count.assignedOrders} طلب`}
                  meta={`تقييم ${tech.rating ? tech.rating.toFixed(1) : "-"} · شكاوى ${tech._count.complaintAssignments} · صيانة ${tech._count.maintenanceAssignments}`}
                  href={`/admin/technicians/${tech.id}`}
                />
              ))
            )}
          </Panel>

          <Panel title="تنبيه المخزون">
            {lowStock.length === 0 ? (
              <p>لا توجد أصناف عند حد إعادة الطلب أو أقل.</p>
            ) : (
              lowStock.slice(0, 10).map((item) => (
                <Row
                  key={item.id}
                  title={`${item.sku} — ${item.nameAr}`}
                  value={`${Number(item.quantity).toLocaleString("ar-EG")} / ${Number(item.reorderLevel).toLocaleString("ar-EG")}`}
                  href="/admin/inventory"
                  danger
                />
              ))
            )}
          </Panel>

          <Panel title="مصادر العملاء غير المكتملين">
            {leads.length === 0 ? (
              <p>لا توجد بيانات مصادر بعد.</p>
            ) : (
              leads.map((item, index) => (
                <Row
                  key={`${item.source}:${item.status}:${index}`}
                  title={item.source || "غير معروف"}
                  value={`${item._count} عميل`}
                  meta={item.status}
                  href="/admin/leads"
                />
              ))
            )}
          </Panel>
        </div>
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
      <b style={{ fontSize: 23, color: danger ? "#b91c1c" : "#0f2d4a" }}>
        {value}
      </b>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div style={metricStyle}>
      <span>{label}</span>
      <strong>{Number(value || 0).toFixed(1)} / 5</strong>
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
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </section>
  );
}

function Row({
  title,
  value,
  meta,
  href,
  danger = false,
}: {
  title: string;
  value: string;
  meta?: string;
  href?: string;
  danger?: boolean;
}) {
  const body = (
    <div style={rowStyle}>
      <div>
        <strong>{title}</strong>
        {meta && (
          <small style={{ display: "block", color: "#64748b", marginTop: 3 }}>
            {meta}
          </small>
        )}
      </div>
      <b style={{ color: danger ? "#b91c1c" : "#0f2d4a" }}>{value}</b>
    </div>
  );

  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {body}
    </Link>
  ) : (
    body
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
  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
  gap: 10,
  margin: "20px 0",
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
  gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
  gap: 16,
};

const panelStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};

const metricStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  borderBottom: "1px solid #e2e8f0",
  padding: "8px 0",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "#f8fafc",
};

const actionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 40,
  borderRadius: 10,
  background: "#0f2d4a",
  color: "white",
  textDecoration: "none",
  padding: "0 13px",
  fontWeight: 900,
};
