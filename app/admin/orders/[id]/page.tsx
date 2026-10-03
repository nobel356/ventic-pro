import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderActions from "./OrderActions";
import VenticEstimateEditor from "./VenticEstimateEditor";
import UnifiedOrderCenter from "./UnifiedOrderCenter";
import { calculateOrderFinancials } from "@/lib/order-financials";
import { getOrderMaterialState } from "@/lib/order-materials";
import { parseInventoryNote } from "@/lib/inventory";

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
  INVOICE_SYNCED: "مزامنة الفاتورة",
  VENTIC_ESTIMATE_CREATED: "إنشاء مقايسة Ventic Pro",
  VENTIC_ESTIMATE_UPDATED: "تعديل المقايسة",
  VENTIC_ESTIMATE_SENT: "إرسال المقايسة للعميل",
  VENTIC_ESTIMATE_ACCEPTED: "العميل وافق على المقايسة",
  VENTIC_ESTIMATE_REJECTED: "العميل رفض المقايسة",
  EXTRA_CHARGE_REQUESTED: "طلب تكلفة إضافية",
  EXTRA_CHARGE_ACCEPTED: "العميل وافق على تكلفة إضافية",
  EXTRA_CHARGE_REJECTED: "العميل رفض تكلفة إضافية",
  ORDER_MATERIAL_USED: "استخدام خامة في التنفيذ",
  ORDER_MATERIALS_CONFIRMED_NONE: "تأكيد عدم استخدام خامات",
  WARRANTY_AUTO_CREATED: "تفعيل الضمان تلقائيًا",
  ORDER_COMPLETED: "إتمام الطلب",
  ORDER_COMPLETED_WITH_OTP: "إتمام الطلب بكود العميل",
  COMPLETION_OTP_SENT: "إصدار كود إتمام",
  COMPLETION_OTP_ISSUED: "إصدار كود إتمام",
  TECHNICIAN_SLOT_CREATED: "إضافة موعد للفني",
  TECHNICIAN_SLOT_DELETED: "إلغاء موعد فني",
};

function money(value: unknown) {
  return Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
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
      venticEstimates: {
        orderBy: { version: "desc" },
      },
      extraCharges: {
        orderBy: { createdAt: "desc" },
      },
      warranties: {
        orderBy: { createdAt: "desc" },
      },
      review: true,
      inventoryMovements: {
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              nameAr: true,
              unit: true,
            },
          },
          technician: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 80,
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

  const [technicians, finance, materialState] = await Promise.all([
    prisma.user.findMany({
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
    }),
    calculateOrderFinancials(prisma, id),
    getOrderMaterialState(
      prisma,
      id,
      order.technicianId,
    ),
  ]);

  const acceptedEstimate =
    order.venticEstimates.find(
      (estimate) => estimate.status === "ACCEPTED",
    ) || null;

  const latestEstimate =
    order.venticEstimates[0] || null;

  const beforeCount = order.attachments.filter(
    (item) => item.kind === "BEFORE",
  ).length;

  const afterCount = order.attachments.filter(
    (item) => item.kind === "AFTER",
  ).length;

  const hasAppointment =
    Boolean(order.technicianId) &&
    Boolean(order.preferredDate) &&
    Boolean(order.preferredTime) &&
    order.technicianSlots.length > 0;

  const invoice = order.invoice
    ? {
        id: order.invoice.id,
        invoiceNo: order.invoice.invoiceNo,
        total: Number(order.invoice.total),
        paid: Number(order.invoice.paid),
        due: Number(order.invoice.due),
      }
    : null;

  const invoiceNeedsSync =
    finance.authoritative &&
    (!invoice ||
    Math.abs(invoice.total - finance.total) > 0.009 ||
    Math.abs(invoice.paid - finance.paid) > 0.009 ||
    Math.abs(invoice.due - finance.due) > 0.009);

  const warranty = order.warranties[0] || null;

  const steps = [
    {
      key: "quote",
      label: "المقايسة",
      detail: acceptedEstimate
        ? `معتمدة — إصدار ${acceptedEstimate.version}`
        : latestEstimate?.status === "SENT"
          ? "مرسلة للعميل وننتظر الرد"
          : "تحتاج إعداد/إرسال مقايسة Ventic Pro",
      state: acceptedEstimate
        ? ("DONE" as const)
        : latestEstimate?.status === "SENT"
          ? ("WAIT" as const)
          : ("ACTION" as const),
      anchor: "#ventic-estimate",
    },
    {
      key: "schedule",
      label: "الفني والميعاد",
      detail: hasAppointment
        ? `${order.technician?.name || ""} — ${order.preferredDate} — ${order.preferredTime}`
        : order.technicianId
          ? "الفني معين ويجب استكمال ربط الموعد"
          : "اختر الفني والميعاد",
      state: hasAppointment
        ? ("DONE" as const)
        : ("ACTION" as const),
      anchor: "#order-management",
    },
    {
      key: "execution",
      label: "التنفيذ والصور",
      detail:
        beforeCount && afterCount
          ? "صور قبل وبعد مسجلة"
          : `قبل: ${beforeCount} — بعد: ${afterCount}`,
      state:
        order.status === "COMPLETED" ||
        (beforeCount > 0 && afterCount > 0)
          ? ("DONE" as const)
          : order.status === "IN_PROGRESS" ||
              order.status === "ARRIVED"
            ? ("ACTION" as const)
            : ("INFO" as const),
      anchor: "#execution",
    },
    {
      key: "materials",
      label: "الخامات",
      detail: materialState.confirmed
        ? materialState.confirmedNone
          ? "تم تأكيد عدم استخدام خامات"
          : `${materialState.usedMovements.length} حركة استخدام مرتبطة بالأوردر`
        : "لم يتم تأكيد الخامات بعد",
      state: materialState.confirmed
        ? ("DONE" as const)
        : order.status === "IN_PROGRESS" ||
            order.status === "ARRIVED"
          ? ("ACTION" as const)
          : ("INFO" as const),
      anchor: "#materials",
    },
    {
      key: "finance",
      label: "الفاتورة والتحصيل",
      detail: acceptedEstimate
        ? finance.due <= 0
          ? "الفاتورة المعتمدة مسددة"
          : `متبقي ${money(finance.due)} ج`
        : "تتثبت الفاتورة تلقائيًا بعد اعتماد مقايسة Ventic Pro",
      state: acceptedEstimate
        ? finance.due <= 0
          ? ("DONE" as const)
          : ("ACTION" as const)
        : ("INFO" as const),
      anchor: "#financials",
    },
    {
      key: "warranty",
      label: "الضمان",
      detail: warranty
        ? `نشط حتى ${new Date(
            warranty.endsAt,
          ).toLocaleDateString("ar-EG")}`
        : order.status === "COMPLETED"
          ? "طلب قديم مكتمل بدون ضمان مسجل"
          : "يتفعل تلقائيًا عند إتمام التركيب",
      state: warranty
        ? ("DONE" as const)
        : order.status === "COMPLETED"
          ? ("ACTION" as const)
          : ("INFO" as const),
      anchor: "#after-completion",
    },
    {
      key: "review",
      label: "التقييم",
      detail: order.review
        ? `تم التقييم — ${order.review.overall}/5`
        : order.status === "COMPLETED"
          ? "في انتظار تقييم العميل"
          : "يتاح بعد الإتمام",
      state: order.review
        ? ("DONE" as const)
        : order.status === "COMPLETED"
          ? ("WAIT" as const)
          : ("INFO" as const),
      anchor: "#after-completion",
    },
  ];

  return (
    <main className="admin" dir="rtl">
      <section>
        <div className="adminTitle">
          <div>
            <Link href="/admin/orders">
              ← العودة للطلبات
            </Link>
            <h1>{order.orderNo}</h1>
            <p>
              مركز الطلب الموحد: التشغيل، المقايسة، الفاتورة، الخامات، الضمان وسجل التغييرات.
            </p>
          </div>

          <span>
            {statusLabels[order.status] || order.status}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 9,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <a href="#order-management" style={quickLinkStyle}>
            التشغيل
          </a>
          <a href="#ventic-estimate" style={quickLinkStyle}>
            المقايسة
          </a>
          <a href="#materials" style={quickLinkStyle}>
            الخامات
          </a>
          <a href="#financials" style={quickLinkStyle}>
            الفاتورة والمدفوعات
          </a>
          <a href="#after-completion" style={quickLinkStyle}>
            الضمان والتقييم
          </a>
          <a href="#timeline" style={quickLinkStyle}>
            Timeline
          </a>
        </div>

        <UnifiedOrderCenter
          orderId={order.id}
          steps={steps}
          finance={{
            source: finance.source,
            authoritative: finance.authoritative,
            baseSubtotal: finance.baseSubtotal,
            approvedExtras: finance.approvedExtras,
            discount: finance.discount,
            total: finance.total,
            paid: finance.paid,
            due: finance.due,
          }}
          invoice={invoice}
          invoiceNeedsSync={invoiceNeedsSync}
        />

        <div id="order-management">
          <OrderActions
            orderId={order.id}
            currentStatus={order.status}
            technicianId={order.technicianId}
            preferredDate={order.preferredDate}
            preferredTime={order.preferredTime}
            technicians={technicians}
          />
        </div>

        <div className="cards">
          <article className="miniCard">
            <strong>العميل</strong>
            <h3>{order.customer.name}</h3>
            <p>{order.customer.phone}</p>
          </article>

          <article className="miniCard">
            <strong>العنوان</strong>
            <h3>
              {order.governorate || "-"} -{" "}
              {order.area || "-"}
            </h3>
            <p>
              {order.address ||
                "لا يوجد عنوان تفصيلي"}
            </p>
          </article>

          <article className="miniCard">
            <strong>الموعد</strong>
            <h3>{order.preferredDate || "-"}</h3>
            <p>{order.preferredTime || "-"}</p>
          </article>

          <article className="miniCard">
            <strong>الفني</strong>
            <h3>
              {order.technician?.name ||
                "غير معين"}
            </h3>
            <p>
              {order.technician?.phone || "-"}
            </p>
          </article>

          <article className="miniCard">
            <strong>إجمالي الفاتورة الحالي</strong>
            <h3>{money(finance.total)} ج</h3>
            <p>
              يشمل الإضافات المعتمدة تلقائيًا
            </p>
          </article>

          <article className="miniCard">
            <strong>المتبقي</strong>
            <h3>{money(finance.due)} ج</h3>
            <p>
              المدفوع {money(finance.paid)} ج
            </p>
          </article>
        </div>

        <div
          className="adminQuick"
          style={{ marginTop: 24 }}
        >
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
              <h2 style={{ marginBottom: 6 }}>
                الميعاد المرتبط بالأوردر
              </h2>
              <p style={{ marginTop: 0 }}>
                تغيير الفني أو الموعد من الأوردر يحدث التقويم تلقائيًا.
              </p>
            </div>
            <Link href="/admin/schedule">
              فتح التقويم
            </Link>
          </div>

          {order.technicianSlots.length === 0 ? (
            <p>
              لا يوجد موعد تقويم مرتبط بالطلب.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 9 }}>
              {order.technicianSlots.map((slot) => (
                <div
                  key={slot.id}
                  style={{
                    border:
                      "1px solid #bbf7d0",
                    background: "#f0fdf4",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <strong>
                    {slot.technician.name}
                  </strong>
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
          id="execution"
          className="adminQuick"
          style={{ marginTop: 24 }}
        >
          <h2>توثيق التنفيذ</h2>
          <div className="cards">
            <article className="miniCard">
              <strong>صور قبل</strong>
              <h3>{beforeCount}</h3>
            </article>
            <article className="miniCard">
              <strong>صور بعد</strong>
              <h3>{afterCount}</h3>
            </article>
            <article className="miniCard">
              <strong>إجمالي المرفقات</strong>
              <h3>{order.attachments.length}</h3>
            </article>
          </div>
        </div>

        <div
          id="customer-estimate"
          className="adminQuick"
          style={{ marginTop: 24 }}
        >
          <h2>مقايسة العميل الأصلية</h2>
          <p>
            مرجع فقط ولا يتم تعديلها عند إعداد مقايسة Ventic Pro.
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
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: 14,
                }}
              >
                <h3>
                  {space.label ||
                    spaceLabels[space.type] ||
                    space.type}
                </h3>

                {space.services.length === 0 ? (
                  <p>
                    لا توجد خدمات مسجلة لهذا المكان.
                  </p>
                ) : (
                  <div
                    style={{
                      overflowX: "auto",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        minWidth: 620,
                      }}
                    >
                      <thead>
                        <tr>
                          <th>الخدمة</th>
                          <th>الكمية</th>
                          <th>سعر الوحدة</th>
                          <th>الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {space.services.map(
                          (service) => {
                            const qty = Number(
                              service.qty,
                            );
                            const unitPrice =
                              Number(
                                service.unitPriceSnapshot,
                              );

                            return (
                              <tr key={service.id}>
                                <td>
                                  {
                                    service.serviceNameSnapshot
                                  }
                                </td>
                                <td>{qty}</td>
                                <td>
                                  {money(
                                    unitPrice,
                                  )}{" "}
                                  ج
                                </td>
                                <td>
                                  {money(
                                    qty *
                                      unitPrice,
                                  )}{" "}
                                  ج
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div id="ventic-estimate">
          <VenticEstimateEditor
            orderId={order.id}
          />
        </div>

        <div
          id="materials"
          className="adminQuick"
          style={{ marginTop: 24 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ marginBottom: 6 }}>
                خامات الأوردر
              </h2>
              <p style={{ marginTop: 0 }}>
                الفني يسجل الاستخدام من شاشة التنفيذ؛ الخصم من العهدة والربط بالأوردر يحدثان مرة واحدة تلقائيًا.
              </p>
            </div>
            <Link href="/admin/inventory">
              فتح المخزون
            </Link>
          </div>

          {materialState.confirmedNone ? (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: "#f0fdf4",
                color: "#166534",
                border:
                  "1px solid #bbf7d0",
              }}
            >
              الفني أكد عدم استخدام خامات في هذا الطلب.
            </div>
          ) : materialState.usedMovements.length === 0 ? (
            <p>
              لم يتم تسجيل خامات مستخدمة حتى الآن.
            </p>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 700,
                }}
              >
                <thead>
                  <tr>
                    <th>الخامة</th>
                    <th>الكمية</th>
                    <th>الفني</th>
                    <th>الوقت</th>
                    <th>الملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {materialState.usedMovements.map(
                    (movement: any) => {
                      const parsed =
                        parseInventoryNote(
                          movement.note,
                        );

                      return (
                        <tr key={movement.id}>
                          <td>
                            {movement.item.sku} —{" "}
                            {movement.item.nameAr}
                          </td>
                          <td>
                            {money(
                              movement.quantity,
                            )}{" "}
                            {movement.item.unit}
                          </td>
                          <td>
                            {movement.technician
                              ?.name || "-"}
                          </td>
                          <td>
                            {cairoDateTime(
                              movement.createdAt,
                            )}
                          </td>
                          <td>
                            {parsed.note || "-"}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          id="financials"
          className="adminQuick"
          style={{ marginTop: 24 }}
        >
          <h2>الفاتورة والمدفوعات</h2>
          <p>
            المقايسة المعتمدة + الإضافات التي وافق عليها العميل = إجمالي الفاتورة. تسجيل أي دفعة يحدث الفاتورة تلقائيًا.
          </p>

          <div className="cards">
            <article className="miniCard">
              <strong>أساس المقايسة</strong>
              <h3>
                {money(
                  finance.baseSubtotal,
                )}{" "}
                ج
              </h3>
            </article>
            <article className="miniCard">
              <strong>إضافات معتمدة</strong>
              <h3>
                {money(
                  finance.approvedExtras,
                )}{" "}
                ج
              </h3>
            </article>
            <article className="miniCard">
              <strong>الخصم</strong>
              <h3>
                {money(finance.discount)} ج
              </h3>
            </article>
            <article className="miniCard">
              <strong>الإجمالي</strong>
              <h3>
                {money(finance.total)} ج
              </h3>
            </article>
            <article className="miniCard">
              <strong>المدفوع</strong>
              <h3>
                {money(finance.paid)} ج
              </h3>
            </article>
            <article className="miniCard">
              <strong>المتبقي</strong>
              <h3>
                {money(finance.due)} ج
              </h3>
            </article>
          </div>

          {order.payments.length > 0 && (
            <div
              style={{
                overflowX: "auto",
                marginTop: 14,
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 620,
                }}
              >
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>المبلغ</th>
                    <th>الطريقة</th>
                    <th>المرجع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.payments.map(
                    (payment) => (
                      <tr key={payment.id}>
                        <td>
                          {cairoDateTime(
                            payment.createdAt,
                          )}
                        </td>
                        <td>
                          {money(
                            payment.amount,
                          )}{" "}
                          ج
                        </td>
                        <td>
                          {payment.method}
                        </td>
                        <td>
                          {payment.reference ||
                            "-"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          id="after-completion"
          className="adminQuick"
          style={{ marginTop: 24 }}
        >
          <h2>بعد الإتمام</h2>

          <div className="cards">
            <article className="miniCard">
              <strong>الضمان</strong>
              <h3>
                {warranty
                  ? "نشط"
                  : "غير مفعل"}
              </h3>
              <p>
                {warranty
                  ? `${new Date(
                      warranty.startsAt,
                    ).toLocaleDateString(
                      "ar-EG",
                    )} → ${new Date(
                      warranty.endsAt,
                    ).toLocaleDateString(
                      "ar-EG",
                    )}`
                  : "يُنشأ تلقائيًا عند إتمام الطلب الجديد"}
              </p>
            </article>

            <article className="miniCard">
              <strong>تقييم العميل</strong>
              <h3>
                {order.review
                  ? `${order.review.overall}/5`
                  : "لم يصل بعد"}
              </h3>
              <p>
                {order.review?.comment ||
                  "التقييم مرتبط بنفس الطلب والفني"}
              </p>
            </article>
          </div>
        </div>

        <div
          id="timeline"
          className="adminQuick"
          style={{ marginTop: 24 }}
        >
          <h2>Timeline الطلب</h2>
          <p>
            السجل الموحد لكل تغيير مالي وتشغيلي ومخزني على الطلب.
          </p>

          {order.auditLogs.length === 0 ? (
            <p>لا توجد أحداث مسجلة.</p>
          ) : (
            <div
              style={{
                position: "relative",
                paddingRight: 22,
                borderRight:
                  "2px solid #dbeafe",
              }}
            >
              {order.auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    position: "relative",
                    padding:
                      "0 12px 18px 0",
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
                      border:
                        "3px solid white",
                      boxShadow:
                        "0 0 0 1px #fed7aa",
                    }}
                  />
                  <strong
                    style={{
                      color: "#0f2d4a",
                    }}
                  >
                    {actionLabels[
                      log.action
                    ] || log.action}
                  </strong>
                  <p
                    style={{
                      margin: "5px 0",
                      color: "#475569",
                    }}
                  >
                    بواسطة {log.actorLabel}
                  </p>
                  <small
                    style={{
                      color: "#64748b",
                    }}
                  >
                    {cairoDateTime(
                      log.createdAt,
                    )}
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
