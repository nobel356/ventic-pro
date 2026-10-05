import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";

function cairoDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
}

export default async function AdminHome() {
  const user = await currentUser();
  const now = new Date();
  const today = cairoDateKey(now);
  const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);

  const [
    newOrders,
    activeOrders,
    unassignedOrders,
    staleOrders,
    todayOrders,
    dueInvoices,
    dueAgg,
    openComplaints,
    openMaintenance,
    lowStockRaw,
    abandonedLeads,
    followupsDue,
    draftStocktakes,
    sentEstimates,
    upcomingSlots,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.order.count({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    }),
    prisma.order.count({
      where: {
        technicianId: null,
        status: { in: ["NEW", "CONFIRMED"] },
      },
    }),
    prisma.order.count({
      where: {
        status: "NEW",
        createdAt: { lte: staleCutoff },
      },
    }),
    prisma.order.count({
      where: {
        preferredDate: today,
        status: { not: "CANCELLED" },
      },
    }),
    prisma.invoice.count({
      where: {
        due: { gt: 0 },
      },
    }),
    prisma.invoice.aggregate({
      _sum: { due: true },
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
        quantity: true,
        reorderLevel: true,
      },
    }),
    prisma.lead.count({
      where: {
        status: { in: ["STARTED", "ABANDONED"] },
        consentToFollowUp: true,
      },
    }),
    prisma.lead.count({
      where: {
        status: { in: ["STARTED", "CONTACTED", "ABANDONED"] },
        consentToFollowUp: true,
        nextFollowUpAt: {
          lte: now,
        },
      },
    }),
    prisma.stocktake.count({
      where: { status: "DRAFT" },
    }),
    prisma.venticEstimate.count({
      where: { status: "SENT" },
    }),
    prisma.technicianSlot.findMany({
      where: {
        startsAt: { gte: now },
      },
      include: {
        technician: {
          select: { name: true },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            customer: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
  ]);

  const lowStock = lowStockRaw.filter(
    (item) => Number(item.quantity) <= Number(item.reorderLevel),
  ).length;

  const actions = [
    {
      title: "طلبات بدون فني",
      count: unassignedOrders,
      href: "/admin/orders",
      detail: "طلبات جديدة أو مؤكدة تحتاج تعيين فني.",
      danger: unassignedOrders > 0,
    },
    {
      title: "طلبات جديدة متأخرة",
      count: staleOrders,
      href: "/admin/orders",
      detail: "مر عليها أكثر من 30 دقيقة بدون تأكيد.",
      danger: staleOrders > 0,
    },
    {
      title: "فواتير بها متبقي",
      count: dueInvoices,
      href: "/admin/accounting",
      detail: `${money(dueAgg._sum.due)} ج إجمالي متبقي.`,
      danger: dueInvoices > 0,
    },
    {
      title: "شكاوى مفتوحة",
      count: openComplaints,
      href: "/admin/aftercare",
      detail: "شكاوى أو إعادة زيارات لم تغلق بعد.",
      danger: openComplaints > 0,
    },
    {
      title: "صيانة مفتوحة",
      count: openMaintenance,
      href: "/admin/aftercare",
      detail: "طلبات صيانة تحتاج متابعة.",
      danger: openMaintenance > 0,
    },
    {
      title: "مخزون تحت الحد",
      count: lowStock,
      href: "/admin/inventory",
      detail: "أصناف وصلت لحد إعادة الطلب أو أقل.",
      danger: lowStock > 0,
    },
    {
      title: "متابعات عملاء مستحقة",
      count: followupsDue,
      href: "/admin/leads",
      detail: `${abandonedLeads} عميل غير مكتمل وافق على المتابعة.`,
      danger: followupsDue > 0,
    },
    {
      title: "جرد غير معتمد",
      count: draftStocktakes,
      href: "/admin/inventory/stocktakes",
      detail: "جلسات جرد ما زالت Draft.",
      danger: draftStocktakes > 0,
    },
    {
      title: "مقايسات تنتظر العميل",
      count: sentEstimates,
      href: "/admin/orders",
      detail: "مقايسات Ventic Pro مرسلة ولم يصل الرد بعد.",
      danger: false,
    },
  ];

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
            <h1 style={{ marginBottom: 6 }}>مركز التشغيل الذكي</h1>
            <p style={{ color: "#64748b", marginTop: 0 }}>
              صباح الخير {user?.name || ""}. هنا تظهر الأشياء التي تحتاج قرارًا أو متابعة بدل التنقل بين الأقسام.
            </p>
          </div>

          {user &&
            can(
              user.role,
              PERMISSIONS.GLOBAL_SEARCH,
              user.permissions,
            ) && (
              <Link href="/admin/search" style={primaryLinkStyle}>
                🔎 بحث شامل
              </Link>
            )}
        </div>

        <div style={statsStyle}>
          <Stat label="طلبات نشطة" value={activeOrders} />
          <Stat label="طلبات جديدة" value={newOrders} />
          <Stat label="مواعيد اليوم" value={todayOrders} />
          <Stat
            label="إجمالي المتبقي"
            value={`${money(dueAgg._sum.due)} ج`}
            danger={Number(dueAgg._sum.due || 0) > 0}
          />
        </div>

        <section style={{ marginTop: 24 }}>
          <h2>Action Center</h2>
          <div style={actionGridStyle}>
            {actions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                style={{
                  ...actionCardStyle,
                  borderColor:
                    action.danger && action.count > 0
                      ? "#fecaca"
                      : "#e2e8f0",
                  background:
                    action.danger && action.count > 0
                      ? "#fff7f7"
                      : "white",
                }}
              >
                <div style={actionHeadStyle}>
                  <strong>{action.title}</strong>
                  <b
                    style={{
                      fontSize: 24,
                      color:
                        action.danger && action.count > 0
                          ? "#b91c1c"
                          : "#0f2d4a",
                    }}
                  >
                    {action.count}
                  </b>
                </div>
                <small style={{ color: "#64748b", lineHeight: 1.6 }}>
                  {action.detail}
                </small>
              </Link>
            ))}
          </div>
        </section>

        <div style={twoColStyle}>
          <section style={panelStyle}>
            <div style={headStyle}>
              <div>
                <h2 style={{ margin: 0 }}>أقرب المواعيد</h2>
                <p style={mutedStyle}>كل المواعيد من جدول الفنيين نفسه.</p>
              </div>
              <Link href="/admin/schedule">فتح التقويم</Link>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {upcomingSlots.length === 0 ? (
                <p>لا توجد مواعيد قادمة.</p>
              ) : (
                upcomingSlots.map((slot) => (
                  <Link
                    key={slot.id}
                    href={
                      slot.orderId
                        ? `/admin/orders/${slot.orderId}`
                        : "/admin/schedule"
                    }
                    style={rowStyle}
                  >
                    <div>
                      <strong>{slot.technician.name}</strong>
                      <small style={{ display: "block", color: "#64748b" }}>
                        {slot.order
                          ? `${slot.order.orderNo} — ${slot.order.customer.name}`
                          : slot.sourceType || "موعد"}
                      </small>
                    </div>
                    <b>
                      {slot.startsAt.toLocaleString("ar-EG", {
                        timeZone: "Africa/Cairo",
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </b>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>اختصارات الإدارة</h2>
            <div style={quickGridStyle}>
              <Quick href="/admin/orders" label="الطلبات" />
              <Quick href="/admin/accounting" label="الحسابات" />
              <Quick href="/admin/inventory" label="المخزون" />
              <Quick href="/admin/aftercare" label="ما بعد التركيب" />
              <Quick href="/admin/customers" label="العملاء" />
              <Quick href="/admin/technicians" label="الفنيون" />
              <Quick href="/admin/reports" label="التقارير" />
              <Quick href="/admin/exports" label="Excel" />
            </div>
          </section>
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
      <b style={{ fontSize: 24, color: danger ? "#b91c1c" : "#0f2d4a" }}>
        {value}
      </b>
      <span style={{ color: "#64748b" }}>{label}</span>
    </div>
  );
}

function Quick({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href} style={quickStyle}>
      {label}
    </Link>
  );
}

const headStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const statsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 10,
  marginTop: 20,
};

const statStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 15,
  padding: 16,
  display: "grid",
  gap: 4,
};

const actionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 12,
};

const actionCardStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  border: "1px solid #e2e8f0",
  borderRadius: 15,
  padding: 15,
  display: "grid",
  gap: 8,
};

const actionHeadStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
  gap: 16,
  marginTop: 24,
};

const panelStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 17,
  padding: 18,
};

const rowStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "#f8fafc",
};

const quickGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
  gap: 8,
};

const quickStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#0f2d4a",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: 10,
  textAlign: "center",
  fontWeight: 800,
  background: "#f8fafc",
};

const primaryLinkStyle: React.CSSProperties = {
  minHeight: 42,
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 10,
  padding: "0 14px",
  color: "white",
  background: "#0f2d4a",
  textDecoration: "none",
  fontWeight: 900,
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  marginBottom: 0,
};
