import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/customer-auth";
import PrintWarrantyButton from "./PrintWarrantyButton";

const statusLabels: Record<string, string> = {
  ACTIVE: "ساري",
  EXPIRED: "منتهي",
  VOID: "ملغي",
};

export default async function WarrantyCertificatePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const customer =
    await currentCustomer();

  if (!customer) {
    redirect("/customer/login");
  }

  const { orderId } = await params;

  const order =
    await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: customer.id,
      },
      include: {
        customer: true,
        technician: {
          select: { name: true },
        },
        warranties: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        installedDevices: {
          where: {
            active: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        spaces: {
          include: {
            services: {
              orderBy: {
                id: "asc",
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });

  const warranty =
    order?.warranties[0];

  if (!order || !warranty) {
    notFound();
  }

  const reference =
    `VP-W-${warranty.id
      .slice(-8)
      .toUpperCase()}`;

  const today = new Date();
  const liveStatus =
    warranty.status === "ACTIVE" &&
    warranty.endsAt < today
      ? "EXPIRED"
      : warranty.status;

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f5f8fb",
        padding: "24px 16px 70px",
      }}
    >
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .noPrint {
            display: none !important;
          }
          .warrantyCard {
            box-shadow: none !important;
            border: 0 !important;
          }
        }
      `}</style>

      <section
        className="warrantyCard"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 20,
          padding: 26,
          boxShadow:
            "0 12px 32px rgba(15,23,42,.07)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <Link
              href="/customer/account"
              className="brand noPrint"
              style={{
                textDecoration: "none",
              }}
            >
              <i>V</i> Ventic Pro
            </Link>
            <div
              style={{
                marginTop: 15,
                color: "#f97316",
                fontWeight: 900,
              }}
            >
              شهادة ضمان
            </div>
            <h1
              style={{
                color: "#0f2d4a",
                margin:
                  "6px 0 5px",
              }}
            >
              {order.orderNo}
            </h1>
            <p
              style={{
                color: "#64748b",
                margin: 0,
              }}
            >
              مرجع الضمان: {reference}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                borderRadius: 999,
                padding: "7px 12px",
                background:
                  liveStatus ===
                  "ACTIVE"
                    ? "#f0fdf4"
                    : "#f8fafc",
                color:
                  liveStatus ===
                  "ACTIVE"
                    ? "#166534"
                    : "#475569",
                border:
                  `1px solid ${
                    liveStatus ===
                    "ACTIVE"
                      ? "#bbf7d0"
                      : "#e2e8f0"
                  }`,
                fontWeight: 900,
              }}
            >
              {statusLabels[liveStatus] ||
                liveStatus}
            </span>
            <PrintWarrantyButton />
          </div>
        </div>

        <div
          style={{
            margin: "24px 0",
            padding: 18,
            borderRadius: 16,
            background: "#0f2d4a",
            color: "white",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: 14,
          }}
        >
          <Info
            light
            label="بداية الضمان"
            value={warranty.startsAt.toLocaleDateString(
              "ar-EG",
            )}
          />
          <Info
            light
            label="نهاية الضمان"
            value={warranty.endsAt.toLocaleDateString(
              "ar-EG",
            )}
          />
          <Info
            light
            label="العميل"
            value={order.customer.name}
          />
          <Info
            light
            label="الفني"
            value={
              order.technician?.name ||
              "غير مسجل"
            }
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(210px,1fr))",
            gap: 12,
          }}
        >
          <Info
            label="المحافظة"
            value={
              order.governorate || "-"
            }
          />
          <Info
            label="المنطقة"
            value={
              order.area || "-"
            }
          />
          <Info
            label="العنوان"
            value={
              order.address || "-"
            }
          />
          <Info
            label="تاريخ إنشاء الطلب"
            value={order.createdAt.toLocaleDateString(
              "ar-EG",
            )}
          />
        </div>

        {order.installedDevices.length >
          0 && (
          <section
            style={{
              marginTop: 26,
            }}
          >
            <h2
              style={{
                color: "#0f2d4a",
              }}
            >
              الأجهزة / التركيبات المسجلة
            </h2>
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {order.installedDevices.map(
                (device) => (
                  <div
                    key={device.id}
                    style={{
                      border:
                        "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong
                      style={{
                        color:
                          "#0f2d4a",
                      }}
                    >
                      {device.type}
                    </strong>
                    <span
                      style={{
                        color:
                          "#64748b",
                      }}
                    >
                      {[
                        device.serviceName,
                        device.brand,
                        device.model,
                        device.size,
                        device.location,
                      ]
                        .filter(Boolean)
                        .join(" — ") ||
                        "تركيب Ventic Pro"}
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>
        )}

        <section
          style={{
            marginTop: 26,
          }}
        >
          <h2
            style={{
              color: "#0f2d4a",
            }}
          >
            الخدمات المرتبطة بالطلب
          </h2>

          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {order.spaces.flatMap(
              (space) =>
                space.services.map(
                  (service) => (
                    <div
                      key={
                        service.id
                      }
                      style={{
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 12,
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <span>
                        <b>
                          {
                            space.label
                          }
                        </b>
                        {" — "}
                        {
                          service.serviceNameSnapshot
                        }
                      </span>
                      <span
                        style={{
                          color:
                            "#64748b",
                        }}
                      >
                        الكمية{" "}
                        {Number(
                          service.qty,
                        )}
                      </span>
                    </div>
                  ),
                ),
            )}
          </div>
        </section>

        {warranty.notes && (
          <section
            style={{
              marginTop: 24,
              background: "#fff7ed",
              border:
                "1px solid #fed7aa",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <strong
              style={{
                color: "#9a3412",
              }}
            >
              ملاحظات الضمان
            </strong>
            <p
              style={{
                marginBottom: 0,
                color: "#7c2d12",
                lineHeight: 1.8,
              }}
            >
              {warranty.notes}
            </p>
          </section>
        )}

        <section
          style={{
            marginTop: 24,
            color: "#64748b",
            lineHeight: 1.8,
            borderTop:
              "1px solid #e2e8f0",
            paddingTop: 16,
          }}
        >
          <p>
            هذه الشهادة مرتبطة بالطلب الموضح أعلاه وبسجل Ventic Pro. تفاصيل نطاق الضمان والاستثناءات تخضع لسياسة الضمان وشروط الخدمة المعتمدة.
          </p>
          <Link
            className="noPrint"
            href="/legal/warranty"
            style={{
              color: "#075985",
              fontWeight: 900,
            }}
          >
            قراءة سياسة الضمان
          </Link>
        </section>
      </section>
    </main>
  );
}

function Info({
  label,
  value,
  light = false,
}: {
  label: string;
  value: string;
  light?: boolean;
}) {
  return (
    <div>
      <small
        style={{
          color: light
            ? "#bfdbfe"
            : "#64748b",
        }}
      >
        {label}
      </small>
      <strong
        style={{
          display: "block",
          marginTop: 4,
          color: light
            ? "white"
            : "#0f2d4a",
        }}
      >
        {value}
      </strong>
    </div>
  );
}
