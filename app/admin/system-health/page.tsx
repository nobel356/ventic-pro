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

  try {
    await prisma.$queryRawUnsafe(
      "SELECT 1",
    );
    databaseOk = true;
  } catch (error: any) {
    databaseError =
      error?.message ||
      "Database check failed";
  }

  const checks = [
    {
      label: "قاعدة البيانات",
      ok: databaseOk,
      detail:
        databaseError ||
        "Neon متصل ويستجيب.",
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
      label: "رابط الموقع العام",
      ok: configured(
        process.env
          .NEXT_PUBLIC_APP_URL,
      ),
      detail:
        process.env
          .NEXT_PUBLIC_APP_URL ||
        "يستخدم رابط Vercel الافتراضي",
    },
    {
      label: "زر WhatsApp",
      ok: configured(
        process.env
          .NEXT_PUBLIC_WHATSAPP_NUMBER,
      ),
      detail:
        "اختياري — لا يؤثر على التشغيل الأساسي",
    },
  ];

  return (
    <main
      className="admin"
      dir="rtl"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "18px 14px 60px",
      }}
    >
      <h1>
        صحة النظام والتشخيص
      </h1>
      <p
        style={{
          color: "#64748b",
        }}
      >
        الصفحة لا تعرض أي Secret أو API Key. هي تعرض فقط حالة الاتصال ووجود الإعدادات.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: 10,
          marginTop: 18,
        }}
      >
        {checks.map((item) => (
          <article
            key={item.label}
            style={{
              background: "white",
              border:
                `1px solid ${
                  item.ok
                    ? "#bbf7d0"
                    : "#fecaca"
                }`,
              borderRadius: 14,
              padding: 15,
            }}
          >
            <strong
              style={{
                color: item.ok
                  ? "#166534"
                  : "#991b1b",
              }}
            >
              {item.ok ? "✓" : "!"}{" "}
              {item.label}
            </strong>
            <small
              style={{
                display: "block",
                marginTop: 7,
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              {item.detail}
            </small>
          </article>
        ))}
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
          احتفظ بالـLogs الآمنة فقط: حالة الخطوة، provider، status code، IDs غير الحساسة، ووجود الإعدادات true/false. لا تسجل OTP أو API Keys أو كلمات المرور.
        </p>
      </section>
    </main>
  );
}
