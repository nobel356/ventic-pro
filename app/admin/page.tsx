import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-v7";

const statusLabels: Record<string, string> = {
  NEW: "جديد",
  CONFIRMED: "تم التأكيد",
  ASSIGNED: "تم تعيين فني",
  ON_THE_WAY: "في الطريق",
  ARRIVED: "وصل",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

function cairoDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG");
}

function cairoDateTime(value: Date | string) {
  return new Date(value).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function Admin() {
  const user = await currentUser();
  const now = new Date();
  const today = cairoDateKey(now);
  const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);

  const [
    totalOrders,
    newOrders,
    activeOrders,
    completedOrders,
    unassignedOrders,
    todayOrders,
    staleOrders,
    paidAgg,
    dueAgg,
    upcomingSlots,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.order.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.order.count({
      where: {
        technicianId: null,
        status: { in: ["NEW", "CONFIRMED"] },
      },
    }),
    prisma.order.findMany({
      where: {
        preferredDate: today,
        status: { not: "CANCELLED" },
      },
      include: {
        customer: true,
        technician: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 12,
    }),
    prisma.order.findMany({
      where: {
        status: "NEW",
        createdAt: { lte: staleCutoff },
      },
      include: { customer: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      _sum: { due: true },
    }),
    prisma.technicianSlot.findMany({
      where: {
        startsAt: { gte: now },
        OR: [
          { orderId: null },
          {
            order: {
              status: {
                notIn: ["COMPLETED", "CANCELLED"],
              },
            },
          },
        ],
      },
      include: {
        technician: { select: { id: true, name: true } },
        order: {
          include: {
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
  ]);

  const paid = Number(paidAgg._sum.amount || 0);
  const due = Number(dueAgg._sum.due || 0);

  return (
    <main className="adminShell" dir="rtl">
      <aside className="adminSide">
        <div className="brand">
          <i>V</i> Ventic Pro
        </div>
        <nav>
          <Link href="/admin">الرئيسية</Link>
          <Link href="/admin/orders">الطلبات</Link>
          <Link href="/admin/schedule">جدول الفنيين</Link>
          <Link href="/admin/customers">العملاء</Link>
          <Link href="/admin/technicians">الفنيون</Link>
          <Link href="/admin/leads">الطلبات غير المكتملة</Link>
          <Link href="/admin/inventory">المخزون</Link>
          <Link href="/admin/aftercare">ما بعد التركيب</Link>
          <Link href="/admin/reports">التقارير</Link>
          {user?.role === "SUPER_ADMIN" && (
            <Link href="/admin/users">المستخدمون والصلاحيات</Link>
          )}
        </nav>
      </aside>

      <section className="adminMain">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ marginBottom: 6 }}>لوحة التشغيل</h1>
            <p style={{ marginTop: 0 }}>
              متابعة التشغيل اليومي والمواعيد والحالات التي تحتاج تدخل.
            </p>
          </div>
          <Link
            href="/admin/schedule"
            style={{
              textDecoration: "none",
              background: "#0f2d4a",
              color: "white",
              padding: "11px 16px",
              borderRadius: 12,
              fontWeight: 800,
            }}
          >
            فتح جدول الفنيين
          </Link>
        </div>

        <div className="adminStats">
          <Card n={totalOrders} t="كل الطلبات" />
          <Card n={activeOrders} t="طلبات نشطة" />
          <Card n={newOrders} t="طلبات جديدة" />
          <Card n={unassignedOrders} t="بدون فني" />
          <Card n={completedOrders} t="طلبات مكتملة" />
          <Card n={`${money(paid)} ج`} t="إجمالي المقبوض" />
          <Card n={`${money(due)} ج`} t="إجمالي المتبقي" />
          <Card n={todayOrders.length} t="مواعيد اليوم" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            gap: 18,
            marginTop: 22,
          }}
        >
          <Panel title="مواعيد اليوم">
            {todayOrders.length === 0 ? (
              <Empty text="لا توجد مواعيد مسجلة لليوم." />
            ) : (
              todayOrders.map((order) => (
                <Row
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  title={`${order.orderNo} — ${order.customer.name}`}
                  meta={`${order.preferredTime || "بدون وقت"} · ${
                    order.area || order.governorate || "بدون منطقة"
                  } · ${order.technician?.name || "بدون فني"}`}
                  badge={statusLabels[order.status] || order.status}
                />
              ))
            )}
          </Panel>

          <Panel title="طلبات تحتاج متابعة">
            {staleOrders.length === 0 ? (
              <Empty text="لا توجد طلبات جديدة متأخرة عن التأكيد." />
            ) : (
              staleOrders.map((order) => (
                <Row
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  title={`${order.orderNo} — ${order.customer.name}`}
                  meta={`وصل منذ ${cairoDateTime(order.createdAt)}`}
                  badge="بدون تأكيد"
                  danger
                />
              ))
            )}
          </Panel>

          <Panel title="أقرب حجوزات الفنيين">
            {upcomingSlots.length === 0 ? (
              <Empty text="لا توجد حجوزات قادمة في الجدول." />
            ) : (
              upcomingSlots.map((slot) => (
                <Row
                  key={slot.id}
                  href={
                    slot.orderId
                      ? `/admin/orders/${slot.orderId}`
                      : "/admin/schedule"
                  }
                  title={`${slot.technician.name}${
                    slot.order ? ` — ${slot.order.orderNo}` : ""
                  }`}
                  meta={`${cairoDateTime(slot.startsAt)}${
                    slot.order?.customer?.name
                      ? ` · ${slot.order.customer.name}`
                      : ""
                  }`}
                  badge="موعد"
                />
              ))
            )}
          </Panel>
        </div>

        <div className="adminQuick" style={{ marginTop: 22 }}>
          <h2>اختصارات التشغيل</h2>
          <div>
            <Link href="/admin/orders">إدارة الطلبات</Link>
            <Link href="/admin/schedule">تقويم الفنيين</Link>
            <Link href="/admin/technicians">إدارة الفنيين</Link>
            <Link href="/admin/inventory">مراجعة المخزون</Link>
            <Link href="/admin/aftercare">الصيانة والضمان</Link>
            <Link href="/admin/reports">التقارير</Link>
            {user?.role === "SUPER_ADMIN" && (
              <Link href="/admin/users">المستخدمون والصلاحيات</Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({ n, t }: { n: number | string; t: string }) {
  return (
    <div className="statCard">
      <b>{n}</b>
      <span>{t}</span>
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
    <section
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 8px 24px rgba(15,23,42,.05)",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h2>
      <div style={{ display: "grid", gap: 9 }}>{children}</div>
    </section>
  );
}

function Row({
  href,
  title,
  meta,
  badge,
  danger = false,
}: {
  href: string;
  title: string;
  meta: string;
  badge: string;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: "inherit",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div>
        <strong style={{ color: "#0f2d4a" }}>{title}</strong>
        <small
          style={{
            display: "block",
            color: "#64748b",
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {meta}
        </small>
      </div>
      <span
        style={{
          borderRadius: 999,
          padding: "5px 9px",
          fontSize: 12,
          fontWeight: 800,
          whiteSpace: "nowrap",
          background: danger ? "#fee2e2" : "#eff6ff",
          color: danger ? "#991b1b" : "#1e3a8a",
        }}
      >
        {badge}
      </span>
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p
      style={{
        margin: 0,
        color: "#64748b",
        padding: "12px 0",
      }}
    >
      {text}
    </p>
  );
}
