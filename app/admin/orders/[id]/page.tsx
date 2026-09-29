import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderActions from "./OrderActions";
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

const spaceLabels: Record<string, string> = {
  BATHROOM: "حمام",
  KITCHEN: "مطبخ",
};

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG");
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      technician: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      spaces: {
        include: {
          services: true,
        },
      },
      attachments: true,
      payments: {
        orderBy: { createdAt: "desc" },
      },
      invoice: true,
      quotes: {
        orderBy: { createdAt: "desc" },
      },
      extraCharges: {
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  const technicians = await prisma.user.findMany({
  where: {
    role: "TECHNICIAN",
    active: true,
  },
  select: {
    id: true,
    name: true,
  },
  orderBy: {
    name: "asc",
  },
});
  
  if (!order) notFound();

  return (
    <main className="admin">
      <header>
        <div className="brand">
          <i>V</i> Ventic Pro
        </div>

        <nav>
          <Link href="/admin/orders">الطلبات</Link>
          <Link href="/admin/technicians">الفنيون</Link>
          <Link href="/admin/pricing">الأسعار</Link>
        </nav>
      </header>

      <section>
        <div className="adminTitle">
          <div>
            <Link href="/admin/orders">← العودة للطلبات</Link>
            <h1>{order.orderNo}</h1>
            <p>تفاصيل الطلب ومتابعة التنفيذ</p>
          </div>

          <span>{statusLabels[order.status] || order.status}</span>
        </div>

<OrderActions
  orderId={order.id}
  currentStatus={order.status}
  technicianId={order.technicianId}
  technicians={technicians}
/>
        
        <div className="cards">
          <article className="miniCard">
            <strong>العميل</strong>
            <h3>{order.customer.name}</h3>
            <p>{order.customer.phone}</p>
          </article>

          <article className="miniCard">
            <strong>العنوان</strong>
            <h3>
              {order.governorate || "-"} - {order.area || "-"}
            </h3>
            <p>{order.address || "لا يوجد عنوان تفصيلي"}</p>
          </article>

          <article className="miniCard">
            <strong>الموعد</strong>
            <h3>{order.preferredDate || "-"}</h3>
            <p>{order.preferredTime || "-"}</p>
          </article>

          <article className="miniCard">
            <strong>الفني</strong>
            <h3>{order.technician?.name || "غير معين"}</h3>
            <p>{order.technician?.phone || "-"}</p>
          </article>

          <article className="miniCard">
            <strong>السعر التقديري</strong>
            <h3>{money(order.estimatedTotal)} ج</h3>
            <p>
              {order.estimateAccepted
                ? "العميل وافق على كون السعر تقديريًا"
                : "لم يتم تسجيل الموافقة"}
            </p>
          </article>

          <article className="miniCard">
            <strong>السعر النهائي</strong>
            <h3>
              {order.finalTotal
                ? `${money(order.finalTotal)} ج`
                : "لم يتم تحديده"}
            </h3>
          </article>
        </div>

        <div className="adminQuick" style={{ marginTop: 24 }}>
          <h2>تفاصيل الأماكن والخدمات</h2>

          {order.spaces.length === 0 ? (
            <p>لا توجد تفاصيل مسجلة.</p>
          ) : (
            order.spaces.map((space) => (
              <div
                key={space.id}
                style={{
                  display: "block",
                  marginTop: 16,
                  padding: 18,
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                }}
              >
                <h3>
                  {space.label ||
                    spaceLabels[space.type] ||
                    space.type}
                </h3>

                {space.services.length === 0 ? (
                  <p>لا توجد خدمات مسجلة لهذا المكان.</p>
                ) : (
                  <table style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>الخدمة</th>
                        <th>الكمية</th>
                        <th>سعر الوحدة</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {space.services.map((service) => {
                        const qty = Number(service.qty);
                        const unit = Number(service.unitPriceSnapshot);

                        return (
                          <tr key={service.id}>
                            <td>{service.serviceNameSnapshot}</td>
                            <td>{qty}</td>
                            <td>{money(unit)} ج</td>
                            <td>{money(qty * unit)} ج</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </div>

        <div className="cards" style={{ marginTop: 24 }}>
          <article className="miniCard">
            <h3>المدفوعات</h3>

            {order.payments.length === 0 ? (
              <p>لا توجد مدفوعات حتى الآن.</p>
            ) : (
              order.payments.map((payment) => (
                <p key={payment.id}>
                  {money(payment.amount)} ج — {payment.method}
                </p>
              ))
            )}

            {order.invoice && (
              <>
                <hr />
                <p>الإجمالي: {money(order.invoice.total)} ج</p>
                <p>المدفوع: {money(order.invoice.paid)} ج</p>
                <p>المتبقي: {money(order.invoice.due)} ج</p>
              </>
            )}
          </article>

          <article className="miniCard">
            <h3>عروض الأسعار</h3>

            {order.quotes.length === 0 ? (
              <p>لا يوجد عرض سعر حتى الآن.</p>
            ) : (
              order.quotes.map((quote) => (
                <p key={quote.id}>
                  {money(quote.amount)} ج — {quote.status}
                </p>
              ))
            )}
          </article>

          <article className="miniCard">
            <h3>التكاليف الإضافية</h3>

            {order.extraCharges.length === 0 ? (
              <p>لا توجد تكاليف إضافية.</p>
            ) : (
              order.extraCharges.map((charge) => (
                <p key={charge.id}>
                  {charge.title}: {money(charge.amount)} ج —{" "}
                  {charge.status}
                </p>
              ))
            )}
          </article>

          <article className="miniCard">
            <h3>الصور والمرفقات</h3>
            <p>{order.attachments.length} ملف</p>

            {order.attachments.length === 0 && (
              <small>لم يتم رفع صور حتى الآن.</small>
            )}
          </article>
        </div>

        <div className="adminQuick" style={{ marginTop: 24 }}>
          <h2>سجل الطلب</h2>

          {order.auditLogs.length === 0 ? (
            <p>لا توجد أحداث مسجلة.</p>
          ) : (
            <div style={{ display: "block" }}>
              {order.auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #edf2f5",
                  }}
                >
                  <strong>{log.action}</strong>
                  <p style={{ margin: "5px 0" }}>{log.actorLabel}</p>
                  <small>
                    {new Date(log.createdAt).toLocaleString("ar-EG")}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
