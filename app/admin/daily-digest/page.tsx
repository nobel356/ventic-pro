import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-v7";
import {
  executiveDigestText,
  getExecutiveDigest,
} from "@/lib/executive-digest";
import DailyDigestSendButton from "./DailyDigestSendButton";

export const dynamic =
  "force-dynamic";

function money(
  value: number,
) {
  return value.toLocaleString(
    "ar-EG",
    {
      maximumFractionDigits: 0,
    },
  );
}

function maskEmail(
  email: string,
) {
  return email.replace(
    /(^.).*(@.*$)/,
    "$1***$2",
  );
}

export default async function DailyDigestPage() {
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

  const digest =
    await getExecutiveDigest();

  const cards = [
    ["مواعيد اليوم", digest.todayOrders, false],
    ["طلبات جديدة", digest.newOrders, false],
    ["طلبات متأخرة", digest.staleOrders, digest.staleOrders > 0],
    ["بدون فني", digest.unassignedOrders, digest.unassignedOrders > 0],
    ["فواتير بمتبقي", digest.dueInvoices, digest.dueInvoices > 0],
    ["إجمالي المتبقي", `${money(digest.dueAmount)} ج`, digest.dueAmount > 0],
    ["شكاوى مفتوحة", digest.complaints, digest.complaints > 0],
    ["صيانة مفتوحة", digest.maintenance, digest.maintenance > 0],
    ["مخزون تحت الحد", digest.lowStock, digest.lowStock > 0],
    ["Leads مستحقة", digest.leadsDue, digest.leadsDue > 0],
    ["رسائل فاشلة 24س", digest.failedNotifications24h, digest.failedNotifications24h > 0],
    ["هامش سلبي 30ي", digest.negativeCompletedOrders30d, digest.negativeCompletedOrders30d > 0],
    ["حملات ROAS < 1x", digest.weakCampaigns30d, digest.weakCampaigns30d > 0],
    ["إعلان غير موزع", `${money(digest.unallocatedSpend30d)} ج`, digest.unallocatedSpend30d > 0],
  ] as const;

  return (
    <main
      className="admin"
      dir="rtl"
    >
      <section
        style={{
          maxWidth: 1250,
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
            gap: 14,
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
              الملخص التنفيذي اليومي
            </h1>
            <p
              style={{
                color: "#64748b",
                marginTop: 0,
              }}
            >
              Snapshot سريع للتشغيل والتحصيل والجودة والمخزون والتسويق.
            </p>
          </div>

          <DailyDigestSendButton
            emailMasked={maskEmail(user.email)}
          />
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
          {cards.map(
            ([label, value, danger]) => (
              <article
                key={label}
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
              </article>
            ),
          )}
        </div>

        <section
          style={{
            background: "white",
            border:
              "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            نسخة الرسالة
          </h2>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              lineHeight: 1.9,
              color: "#334155",
              marginBottom: 0,
            }}
          >
            {executiveDigestText(digest)}
          </pre>
        </section>

        <section
          style={{
            marginTop: 16,
            background: "#eff6ff",
            border:
              "1px solid #bfdbfe",
            color: "#1e3a8a",
            borderRadius: 14,
            padding: 15,
            lineHeight: 1.8,
          }}
        >
          الإرسال الحالي يدوي بضغطة واحدة حتى لا نعتمد على خدمة Scheduler مدفوعة أو إعداد خارجي. الصفحة نفسها تُنشئ ملخص اليوم دائمًا من البيانات الحية.
        </section>
      </section>
    </main>
  );
}
