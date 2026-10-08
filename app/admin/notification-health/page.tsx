import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-v7";
import { redactDiagnosticText } from "@/lib/safe-diagnostics";

export const dynamic =
  "force-dynamic";

function providerFromPayload(
  payload: unknown,
) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return "-";
  }

  const provider =
    (payload as Record<
      string,
      unknown
    >).provider;

  return String(
    provider || "-",
  );
}

export default async function NotificationHealthPage() {
  const user =
    await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    user.role !==
    "SUPER_ADMIN"
  ) {
    redirect("/admin");
  }

  const now =
    new Date();
  const since24 =
    new Date(
      now.getTime() -
        24 * 60 * 60 * 1000,
    );
  const since7 =
    new Date(
      now.getTime() -
        7 *
          24 *
          60 *
          60 *
          1000,
    );
  const since30 =
    new Date(
      now.getTime() -
        30 *
          24 *
          60 *
          60 *
          1000,
    );

  const [
    sent24,
    failed24,
    failed7,
    failed30,
    byChannel,
    latestFailures,
  ] = await Promise.all([
    prisma.notification.count({
      where: {
        status: "SENT",
        createdAt: {
          gte: since24,
        },
      },
    }),
    prisma.notification.count({
      where: {
        status: "FAILED",
        createdAt: {
          gte: since24,
        },
      },
    }),
    prisma.notification.count({
      where: {
        status: "FAILED",
        createdAt: {
          gte: since7,
        },
      },
    }),
    prisma.notification.count({
      where: {
        status: "FAILED",
        createdAt: {
          gte: since30,
        },
      },
    }),
    prisma.notification.groupBy({
      by: [
        "channel",
        "status",
      ],
      where: {
        createdAt: {
          gte: since30,
        },
      },
      _count: true,
    }),
    prisma.notification.findMany({
      where: {
        status: "FAILED",
        createdAt: {
          gte: since30,
        },
      },
      select: {
        id: true,
        orderId: true,
        channel: true,
        templateKey: true,
        destinationMasked: true,
        payload: true,
        error: true,
        createdAt: true,
        order: {
          select: {
            orderNo: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),
  ]);

  const successRate24 =
    sent24 + failed24 > 0
      ? (sent24 /
          (sent24 +
            failed24)) *
        100
      : 100;

  return (
    <main
      className="admin"
      dir="rtl"
    >
      <section
        style={{
          maxWidth: 1350,
          margin: "0 auto",
          padding:
            "26px 18px 70px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            alignItems:
              "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                marginBottom: 6,
              }}
            >
              Notification Health Center
            </h1>
            <p
              style={{
                color: "#64748b",
                marginTop: 0,
              }}
            >
              مراقبة إرسال رسائل العملاء بدون عرض بيانات كاملة أو Secrets.
            </p>
          </div>

          <Link
            href="/admin/system-health"
            style={{
              color: "#075985",
              fontWeight: 900,
            }}
          >
            صحة النظام
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: 10,
            margin: "20px 0",
          }}
        >
          <Stat
            label="نجاح 24 ساعة"
            value={`${successRate24.toFixed(1)}%`}
            danger={
              successRate24 <
              95
            }
          />
          <Stat
            label="مرسل 24 ساعة"
            value={sent24}
          />
          <Stat
            label="فشل 24 ساعة"
            value={failed24}
            danger={
              failed24 > 0
            }
          />
          <Stat
            label="فشل 7 أيام"
            value={failed7}
            danger={
              failed7 > 0
            }
          />
          <Stat
            label="فشل 30 يوم"
            value={failed30}
            danger={
              failed30 > 0
            }
          />
        </div>

        <section style={cardStyle}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            القنوات — آخر 30 يوم
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(170px,1fr))",
              gap: 8,
            }}
          >
            {byChannel.length ===
            0 ? (
              <p>
                لا توجد رسائل مسجلة.
              </p>
            ) : (
              byChannel.map(
                (item) => (
                  <div
                    key={`${item.channel}:${item.status}`}
                    style={{
                      border:
                        "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 11,
                      background:
                        item.status ===
                        "FAILED"
                          ? "#fef2f2"
                          : "#f8fafc",
                    }}
                  >
                    <b>
                      {
                        item.channel
                      }{" "}
                      —{" "}
                      {
                        item.status
                      }
                    </b>
                    <span
                      style={{
                        display:
                          "block",
                        marginTop: 4,
                        color:
                          "#64748b",
                      }}
                    >
                      {
                        item._count
                      }{" "}
                      رسالة
                    </span>
                  </div>
                ),
              )
            )}
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            أحدث حالات الفشل
          </h2>

          {latestFailures.length ===
          0 ? (
            <div
              style={{
                color: "#166534",
                background:
                  "#f0fdf4",
                border:
                  "1px solid #bbf7d0",
                borderRadius: 10,
                padding: 12,
              }}
            >
              لا توجد رسائل فاشلة خلال آخر 30 يوم.
            </div>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 1050,
                }}
              >
                <thead>
                  <tr>
                    <th>الوقت</th>
                    <th>الطلب</th>
                    <th>القناة</th>
                    <th>Provider</th>
                    <th>Template</th>
                    <th>الوجهة</th>
                    <th>السبب الآمن</th>
                  </tr>
                </thead>
                <tbody>
                  {latestFailures.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td>
                          {item.createdAt.toLocaleString(
                            "ar-EG",
                            {
                              timeZone:
                                "Africa/Cairo",
                            },
                          )}
                        </td>
                        <td>
                          {item.orderId ? (
                            <Link
                              href={`/admin/orders/${item.orderId}`}
                            >
                              {item.order?.orderNo ||
                                "فتح الطلب"}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {
                            item.channel
                          }
                        </td>
                        <td>
                          {providerFromPayload(
                            item.payload,
                          )}
                        </td>
                        <td>
                          {
                            item.templateKey
                          }
                        </td>
                        <td>
                          {item.destinationMasked ||
                            "-"}
                        </td>
                        <td
                          style={{
                            maxWidth: 340,
                            whiteSpace:
                              "normal",
                          }}
                        >
                          {redactDiagnosticText(
                            item.error ||
                              "DELIVERY_FAILED",
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
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
    <div
      style={{
        background: "white",
        border:
          `1px solid ${
            danger
              ? "#fecaca"
              : "#e2e8f0"
          }`,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <b
        style={{
          display: "block",
          fontSize: 23,
          color:
            danger
              ? "#b91c1c"
              : "#0f2d4a",
        }}
      >
        {value}
      </b>
      <span
        style={{
          color: "#64748b",
        }}
      >
        {label}
      </span>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};
