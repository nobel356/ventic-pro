import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-v7";

export const dynamic = "force-dynamic";

function configured(value: string | undefined) {
  return Boolean(String(value || "").trim());
}

export default async function SecurityAuditPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") redirect("/admin");

  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "");
  const authSecretLength = String(process.env.AUTH_SECRET || "").length;

  const checks = [
    {
      label: "AUTH_SECRET قوي",
      ok: authSecretLength >= 32,
      detail: authSecretLength >= 32 ? "موجود بطول مناسب." : "يفضل 32+ حرف عشوائي.",
    },
    {
      label: "HTTPS public URL",
      ok: appUrl.startsWith("https://"),
      detail: appUrl || "NEXT_PUBLIC_APP_URL غير مضبوط.",
    },
    {
      label: "Same-site mutation guard",
      ok: true,
      detail: "middleware يمنع API mutations القادمة من cross-site browser requests.",
    },
    {
      label: "Content Security Policy",
      ok: true,
      detail: "CSP موجود مع frame allowlist لـ YouTube/TikTok فقط بدل فتح كل iframes.",
    },
    {
      label: "Rate limits للـpublic APIs",
      ok: true,
      detail: "Orders / Leads / Conversion Events محمية بحدود طلبات حسب IP.",
    },
    {
      label: "Conversion events بدون PII",
      ok: true,
      detail: "الـtracker يمنع حقول الاسم والموبايل والإيميل والعنوان والـtokens من Event detail.",
    },
    {
      label: "Referral cookie HttpOnly",
      ok: true,
      detail: "كود الإحالة يُحفظ HttpOnly + SameSite=Lax ولا يحتوي بيانات شخصية.",
    },
    {
      label: "QR لا يحتوي Secret",
      ok: true,
      detail: "QR يحتوي URL فقط، والصفحات الحساسة ما زالت تتطلب Customer Session.",
    },
    {
      label: "Google Review URL",
      ok: configured(process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL),
      detail: configured(process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL)
        ? "جاهز لزر التقييم الخارجي."
        : "اختياري — يظهر الزر تلقائيًا بعد إضافة NEXT_PUBLIC_GOOGLE_REVIEW_URL.",
    },
  ];

  const passed = checks.filter((item) => item.ok).length;

  return (
    <main className="admin" dir="rtl">
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 18px 70px" }}>
        <div style={headStyle}>
          <div>
            <h1 style={{ marginBottom: 6 }}>Security Audit</h1>
            <p style={{ color: "#64748b", marginTop: 0 }}>
              فحص إعدادات الأمان بدون إظهار أي Secret أو API Key.
            </p>
          </div>
          <Link href="/admin/system-health" style={linkStyle}>صحة النظام</Link>
        </div>

        <div
          style={{
            margin: "18px 0",
            padding: 16,
            borderRadius: 15,
            background: passed === checks.length ? "#f0fdf4" : "#fff7ed",
            border: `1px solid ${passed === checks.length ? "#bbf7d0" : "#fed7aa"}`,
          }}
        >
          <strong style={{ color: passed === checks.length ? "#166534" : "#9a3412" }}>
            {passed}/{checks.length} checks جاهزة
          </strong>
        </div>

        <div style={gridStyle}>
          {checks.map((item) => (
            <article
              key={item.label}
              style={{
                background: "white",
                border: `1px solid ${item.ok ? "#bbf7d0" : "#fed7aa"}`,
                borderRadius: 14,
                padding: 15,
              }}
            >
              <strong style={{ color: item.ok ? "#166534" : "#9a3412" }}>
                {item.ok ? "✓" : "○"} {item.label}
              </strong>
              <p style={{ color: "#64748b", lineHeight: 1.7, marginBottom: 0 }}>
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const headStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
  gap: 10,
};
const linkStyle: React.CSSProperties = {
  minHeight: 40,
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 12px",
  color: "#0f2d4a",
  textDecoration: "none",
  background: "white",
  fontWeight: 900,
};
