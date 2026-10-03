import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderActions from "./OrderActions";
import VenticEstimateEditor from "./VenticEstimateEditor";

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

const actionLabels: Record<string, string> = {
  ORDER_CREATED: "إنشاء الطلب",
  ORDER_STATUS_CHANGED: "تغيير حالة الطلب",
  ORDER_APPOINTMENT_CHANGED: "تعديل موعد الطلب",
  TECHNICIAN_ASSIGNED: "تعيين فني",
  PAYMENT_RECORDED: "تسجيل دفعة",
  VENTIC_ESTIMATE_CREATED: "إنشاء مقايسة Ventic Pro",
  VENTIC_ESTIMATE_UPDATED: "تعديل المقايسة",
  VENTIC_ESTIMATE_SENT: "إرسال المقايسة للعميل",
  VENTIC_ESTIMATE_ACCEPTED: "العميل وافق على المقايسة",
  VENTIC_ESTIMATE_REJECTED: "العميل رفض المقايسة",
  EXTRA_CHARGE_REQUESTED: "طلب تكلفة إضافية",
  ORDER_COMPLETED: "إتمام الطلب",
  COMPLETION_OTP_SENT: "إصدار كود إتمام",
  TECHNICIAN_SLOT_CREATED: "إضافة موعد للفني",
  TECHNICIAN_SLOT_DELETED: "إلغاء موعد فني",
};

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
        take: 50,
      },
      technicianSlots: {
        include: {
          technician: {
            select: { id: true, name: true },
          },
        },
        orderBy: { startsAt: "desc" },
        take: 20,
      },
    },
  });

  if (!order) notFound();

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

  return (
    <main className="admin" dir="rtl">
      <header>
        <div className="brand">
          <i>V</i> Ventic Pro
        </div>

        <nav>
          <Link href="/admin">الرئيسية</Link>
          <Link href="/admin/orders">الطلبات</Link>
          <Link href="/admin/schedule">جدول الفنيين</Link>
          <Link href="/admin/technicians">الفنيون</Link>
          <Link href="/admin/pricing">الأسعار</Link>
        </nav>
      </header>

      <section>
        <div className="adminTitle">
          <div>
            <Link href="/admin/orders">← العودة للطلبات</Link>
            <h1>{order.orderNo}</h1>
            <p>مركز الطلب: العميل، التنفيذ، المقايسة، المدفوعات وسجل الأحداث.</p>
          </div>

          <span>{statusLabels[order.status] || order.status}</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 9,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <a href="#customer-estimate" style={quickLinkStyle}>
            مقايسة العميل
          </a>
          <a href="#ventic-estimate" style={quickLinkStyle}>
            مقايسة Ventic Pro
          </a>
          <a href="#financials" style={quickLinkStyle}>
            المدفوعات
          </a>
          <a href="#timeline" style={quickLinkStyle}>
            Timeline
          </a>
          <Link href="/admin/schedule" style={quickLinkStyle}>
            جدول الفنيين
          </Link>
        </div>

        <OrderActions
          orderId={order.id}
          currentStatus={order.status}
          technicianId={order.technicianId}
          preferredDate={order.preferredDate}
          preferredTime={order.preferredTime}
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
            <strong>الموعد المطلوب</strong>
            <h3>{order.preferredDate || "-"}</h3>
            <p>{order.preferredTime || "-"}</p>
          </article>

          <article className="miniCard">
            <strong>الفني</strong>
            <h3>{order.technician?.name || "غير معين"}</h3>
            <p>{order.technician?.phone || "-"}</p>
          </article>

          <article className="miniCard">
            <strong>السعر التقديري للعميل</strong>
            <h3>{money(order.estimatedTotal)} ج</h3>
            <p>
              {order.estimateAccepted
                ? "العميل وافق على كون السعر تقديريًا"
                : "لم يتم تسجيل الموافقة"}
            </p>
          </article>

          <article className="miniCard">
            <strong>السعر النهائي المعتمد</strong>
            <h3>
              {order.finalTotal
                ? `${money(order.finalTotal)} ج`
                : "لم يتم تحديده"}
            </h3>
          </article>
        </div>

        <div className="adminQuick" style={{ marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ marginBottom: 6 }}>مواعيد الفني على الطلب</h2>
              <p style={{ marginTop: 0 }}>
                الموعد المرتبط بالطلب. أي تغيير في الموعد يتم تسجيله بالكامل في Timeline.
              </p>
            </div>
            <Link href="/admin/schedule">إدارة الجدول</Link>
          </div>

          {order.technicianSlots.length === 0 ? (
            <p>لا يوجد موعد تقويم مسجل لهذا الطلب حتى الآن.</p>
          ) : (
            <div style={{ display: "grid", gap: 9 }}>
              {order.technicianSlots.map((slot) => (
                <div
                  key={slot.id}
                  style={{
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>{slot.technician.name}</strong>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        borderRadius: 999,
                        padding: "4px 9px",
                        background: "#dcfce7",
                        color: "#166534",
                      }}
                    >
                      موعد مرتبط بالطلب
                    </span>
                  </div>
                  <p style={{ margin: "5px 0 0" }}>
                    {cairoDateTime(slot.startsAt)} →{" "}
                    {cairoDateTime(slot.endsAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          id="customer-estimate"
          className="adminQuick"
          style={{ marginTop: 24 }}
        >
          <h2>مقايسة العميل الأصلية</h2>
          <p>
            هذه البنود محفوظة كما قدمها العميل وتُستخدم كمرجع فقط. تعديل السعر
            النهائي يتم من خلال مقايسة Ventic Pro المستقلة بالأسفل.
          </p>

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
                  {space.label || spaceLabels[space.type] || space.type}
                </h3>

                {space.services.length === 0 ? (
                  <p>لا توجد خدمات مسجلة لهذا المكان.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", minWidth: 620 }}>
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
                          const unitPrice = Number(
                            service.unitPriceSnapshot,
                          );

                          return (
                            <tr key={service.id}>
                              <td>{service.serviceNameSnapshot}</td>
                              <td>{qty}</td>
                              <td>{money(unitPrice)} ج</td>
                              <td>{money(qty * unitPrice)} ج</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div id="ventic-estimate">
          <VenticEstimateEditor orderId={order.id} />
        </div>

        <div id="financials" className="cards" style={{ marginTop: 24 }}>
          <article className="miniCard">
            <h3>المدفوعات والفاتورة</h3>

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
            <h3>عروض الأسعار القديمة</h3>

            {order.quotes.length === 0 ? (
              <p>لا يوجد عرض سعر قديم.</p>
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

        <div id="timeline" className="adminQuick" style={{ marginTop: 24 }}>
          <h2>Timeline الطلب</h2>
          <p>
            أحدث الأحداث أولًا، مع المستخدم أو الجهة التي نفذت كل تغيير.
          </p>

          {order.auditLogs.length === 0 ? (
            <p>لا توجد أحداث مسجلة.</p>
          ) : (
            <div
              style={{
                position: "relative",
                paddingRight: 22,
                borderRight: "2px solid #dbeafe",
              }}
            >
              {order.auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    position: "relative",
                    padding: "0 12px 18px 0",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      right: -30,
                      top: 3,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#f97316",
                      border: "3px solid white",
                      boxShadow: "0 0 0 1px #fed7aa",
                    }}
                  />
                  <strong style={{ color: "#0f2d4a" }}>
                    {actionLabels[log.action] || log.action}
                  </strong>
                  <p style={{ margin: "5px 0", color: "#475569" }}>
                    بواسطة {log.actorLabel}
                  </p>
                  <small style={{ color: "#64748b" }}>
                    {cairoDateTime(log.createdAt)}
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

const quickLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  padding: "7px 11px",
  background: "white",
  color: "#0f2d4a",
  fontSize: 13,
  fontWeight: 800,
};
