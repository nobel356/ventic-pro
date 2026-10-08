import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-v7";
import EmailTestPanel from "./EmailTestPanel";

function configured(
  value: string | undefined,
) {
  return Boolean(
    String(value || "").trim(),
  );
}

function isCustomDomain(
  value: string | undefined,
) {
  const text =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!text) return false;

  return (
    !text.includes(
      ".vercel.app",
    ) &&
    !text.includes(
      "localhost",
    )
  );
}

export const dynamic =
  "force-dynamic";

export default async function SystemHealthPage() {
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

  let databaseOk = false;
  let databaseError = "";
  let migrationHistoryOk = false;
  let unfinishedMigrations = 0;

  try {
    await prisma.$queryRawUnsafe(
      "SELECT 1",
    );
    databaseOk = true;

    const rows: any[] =
      await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count
         FROM "_prisma_migrations"
         WHERE "finished_at" IS NULL
           AND "rolled_back_at" IS NULL`,
      );

    unfinishedMigrations =
      Number(
        rows?.[0]?.count ||
          0,
      );
    migrationHistoryOk =
      unfinishedMigrations ===
      0;
  } catch (error: any) {
    databaseError =
      error?.message ||
      "Database check failed";
  }

  const runtimeChecks = [
    {
      label: "قاعدة البيانات",
      ok: databaseOk,
      detail:
        databaseError ||
        "Neon متصل ويستجيب.",
    },
    {
      label:
        "Migration history",
      ok:
        migrationHistoryOk,
      detail:
        migrationHistoryOk
          ? "لا توجد migration غير مكتملة في سجل Prisma."
          : `${unfinishedMigrations} migration غير مكتملة أو تعذر قراءة السجل.`,
    },
    {
      label:
        "Direct DB للمigrations",
      ok: configured(
        process.env.DIRECT_URL,
      ),
      detail:
        "DIRECT_URL",
    },
    {
      label: "تخزين الصور",
      ok:
        String(
          process.env
            .STORAGE_PROVIDER ||
            "",
        ).toLowerCase() ===
          "vercel_blob" &&
        configured(
          process.env
            .BLOB_READ_WRITE_TOKEN,
        ) &&
        configured(
          process.env
            .BLOB_STORE_ID,
        ),
      detail:
        "Vercel Blob private store",
    },
    {
      label: "إرسال الإيميل",
      ok:
        String(
          process.env
            .EMAIL_PROVIDER ||
            "",
        ).toLowerCase() ===
          "resend" &&
        configured(
          process.env
            .RESEND_API_KEY,
        ) &&
        configured(
          process.env
            .EMAIL_FROM,
        ),
      detail:
        "Resend + EMAIL_FROM",
    },
    {
      label: "أمان الجلسات",
      ok: configured(
        process.env.AUTH_SECRET,
      ),
      detail: "AUTH_SECRET",
    },
    {
      label:
        "Service Worker آمن",
      ok: true,
      detail:
        "V12K: Cache عام فقط؛ admin/customer account/technician/api مستثناة.",
    },
  ];

  const launchChecks = [
    {
      label:
        "NEXT_PUBLIC_APP_URL",
      ok: configured(
        process.env
          .NEXT_PUBLIC_APP_URL,
      ),
      detail:
        process.env
          .NEXT_PUBLIC_APP_URL ||
        "يستخدم fallback Vercel.",
      required: true,
    },
    {
      label:
        "Custom domain",
      ok: isCustomDomain(
        process.env
          .NEXT_PUBLIC_APP_URL,
      ),
      detail:
        isCustomDomain(
          process.env
            .NEXT_PUBLIC_APP_URL,
        )
          ? "الدومين العام ليس vercel.app."
          : "مطلوب قبل الإطلاق التجاري النهائي.",
      required: false,
    },
    {
      label:
        "Support email",
      ok: configured(
        process.env
          .NEXT_PUBLIC_SUPPORT_EMAIL,
      ),
      detail:
        "NEXT_PUBLIC_SUPPORT_EMAIL",
      required: true,
    },
    {
      label:
        "Support phone",
      ok: configured(
        process.env
          .NEXT_PUBLIC_SUPPORT_PHONE,
      ),
      detail:
        "NEXT_PUBLIC_SUPPORT_PHONE",
      required: true,
    },
    {
      label:
        "Legal name",
      ok: configured(
        process.env
          .NEXT_PUBLIC_LEGAL_NAME,
      ),
      detail:
        "NEXT_PUBLIC_LEGAL_NAME",
      required: true,
    },
    {
      label:
        "Floating WhatsApp",
      ok: configured(
        process.env
          .NEXT_PUBLIC_WHATSAPP_NUMBER,
      ),
      detail:
        "NEXT_PUBLIC_WHATSAPP_NUMBER",
      required: false,
    },
    {
      label:
        "Social links",
      ok:
        configured(
          process.env
            .NEXT_PUBLIC_FACEBOOK_URL,
        ) ||
        configured(
          process.env
            .NEXT_PUBLIC_INSTAGRAM_URL,
        ) ||
        configured(
          process.env
            .NEXT_PUBLIC_TIKTOK_URL,
        ),
      detail:
        "Facebook / Instagram / TikTok",
      required: false,
    },
  ];

  const requiredLaunch =
    launchChecks.filter(
      (item) =>
        item.required,
    );
  const requiredReady =
    requiredLaunch.filter(
      (item) => item.ok,
    ).length;

  return (
    <main
      className="admin"
      dir="rtl"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding:
          "18px 14px 60px",
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
          <h1>
            صحة النظام وجاهزية الإطلاق
          </h1>
          <p
            style={{
              color: "#64748b",
            }}
          >
            الصفحة لا تعرض Secret أو API Key؛ فقط حالة الاتصال ووجود الإعدادات.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/admin/notification-health"
            style={linkStyle}
          >
            صحة الرسائل
          </Link>
          <Link
            href="/admin/daily-digest"
            style={linkStyle}
          >
            الملخص اليومي
          </Link>
        </div>
      </div>

      <h2>
        Runtime Health
      </h2>

      <div style={gridStyle}>
        {runtimeChecks.map(
          (item) => (
            <HealthCard
              key={
                item.label
              }
              {...item}
            />
          ),
        )}
      </div>

      <section
        style={{
          marginTop: 22,
          background:
            requiredReady ===
            requiredLaunch.length
              ? "#f0fdf4"
              : "#fff7ed",
          border:
            `1px solid ${
              requiredReady ===
              requiredLaunch.length
                ? "#bbf7d0"
                : "#fed7aa"
            }`,
          borderRadius: 16,
          padding: 16,
        }}
      >
        <strong
          style={{
            color:
              requiredReady ===
              requiredLaunch.length
                ? "#166534"
                : "#9a3412",
          }}
        >
          Launch Readiness —{" "}
          {requiredReady}/
          {
            requiredLaunch.length
          }{" "}
          أساسي
        </strong>
        <p
          style={{
            color: "#64748b",
            marginBottom: 0,
          }}
        >
          البنود الاختيارية لا تمنع التشغيل، لكنها مطلوبة أو مفضلة قبل الإطلاق التجاري الكامل.
        </p>
      </section>

      <div
        style={{
          ...gridStyle,
          marginTop: 12,
        }}
      >
        {launchChecks.map(
          (item) => (
            <article
              key={
                item.label
              }
              style={{
                background:
                  "white",
                border:
                  `1px solid ${
                    item.ok
                      ? "#bbf7d0"
                      : item.required
                        ? "#fecaca"
                        : "#fed7aa"
                  }`,
                borderRadius: 14,
                padding: 15,
              }}
            >
              <strong
                style={{
                  color:
                    item.ok
                      ? "#166534"
                      : item.required
                        ? "#991b1b"
                        : "#9a3412",
                }}
              >
                {item.ok
                  ? "✓"
                  : item.required
                    ? "!"
                    : "○"}{" "}
                {item.label}
              </strong>
              <small
                style={{
                  display:
                    "block",
                  marginTop: 7,
                  color:
                    "#64748b",
                  lineHeight: 1.6,
                }}
              >
                {item.detail}
              </small>
            </article>
          ),
        )}
      </div>

      <EmailTestPanel />

      <section
        style={{
          marginTop: 18,
          background: "#fff7ed",
          border:
            "1px solid #fed7aa",
          borderRadius: 14,
          padding: 15,
          color: "#9a3412",
        }}
      >
        <strong>
          قاعدة التشخيص
        </strong>
        <p
          style={{
            marginBottom: 0,
            lineHeight: 1.8,
          }}
        >
          احتفظ بالـLogs الآمنة فقط: مرحلة العملية، provider، status code، internal IDs، ووجود الإعدادات true/false. لا تسجل OTP أو API Keys أو كلمات المرور أو بيانات العميل الكاملة.
        </p>
      </section>
    </main>
  );
}

function HealthCard({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <article
      style={{
        background: "white",
        border:
          `1px solid ${
            ok
              ? "#bbf7d0"
              : "#fecaca"
          }`,
        borderRadius: 14,
        padding: 15,
      }}
    >
      <strong
        style={{
          color: ok
            ? "#166534"
            : "#991b1b",
        }}
      >
        {ok ? "✓" : "!"}{" "}
        {label}
      </strong>
      <small
        style={{
          display: "block",
          marginTop: 7,
          color: "#64748b",
          lineHeight: 1.6,
        }}
      >
        {detail}
      </small>
    </article>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 10,
  marginTop: 10,
};

const linkStyle: React.CSSProperties = {
  minHeight: 40,
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  border:
    "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  color: "#0f2d4a",
  padding: "0 12px",
  fontWeight: 900,
};
