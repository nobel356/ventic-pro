import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-v7";

export const dynamic = "force-dynamic";

function configured(value: string | undefined) {
  return Boolean(String(value || "").trim());
}

function customDomain(value: string | undefined) {
  const text = String(value || "").trim().toLowerCase();

  return Boolean(
    text &&
      !text.includes(".vercel.app") &&
      !text.includes("localhost"),
  );
}

function Card({
  label,
  ok,
  detail,
  state = "normal",
}: {
  label: string;
  ok: boolean;
  detail: string;
  state?: "normal" | "final";
}) {
  const pendingColor = state === "final" ? "#075985" : "#9a3412";

  return (
    <article
      style={{
        background: "white",
        border: `1px solid ${ok ? "#bbf7d0" : state === "final" ? "#bae6fd" : "#fed7aa"}`,
        borderRadius: 14,
        padding: 15,
      }}
    >
      <strong style={{ color: ok ? "#166534" : pendingColor }}>
        {ok ? "✓" : state === "final" ? "→" : "○"} {label}
      </strong>

      <p
        style={{
          color: "#64748b",
          lineHeight: 1.7,
          marginBottom: 0,
          fontSize: 13,
        }}
      >
        {detail}
      </p>
    </article>
  );
}

export default async function LaunchCenterPage() {
  const user = await currentUser();

  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") redirect("/admin");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const measurement = [
    {
      label: "Google Tag Manager",
      ok: configured(process.env.NEXT_PUBLIC_GTM_ID),
      detail:
        "NEXT_PUBLIC_GTM_ID — الطبقة الأساسية لإدارة GA4 وMeta وTikTok بدون Deploy جديد.",
    },
    {
      label: "GA4 direct fallback",
      ok:
        configured(process.env.NEXT_PUBLIC_GTM_ID) ||
        configured(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
      detail:
        "لو GTM غير مستخدم يمكن تشغيل GA4 مباشرة عبر NEXT_PUBLIC_GA_MEASUREMENT_ID.",
    },
    {
      label: "Microsoft Clarity",
      ok: configured(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID),
      detail:
        "NEXT_PUBLIC_CLARITY_PROJECT_ID — يعمل فقط بعد موافقة تحليلات الأداء.",
    },
    {
      label: "Consent layer",
      ok: true,
      detail:
        "التحليلات والتسويق منفصلان، والمستخدم يستطيع اختيار الضروري فقط وإعادة فتح الإعدادات.",
    },
    {
      label: "Internal conversion bridge",
      ok: true,
      detail:
        "أحداث Ventic Pro تُدفع إلى dataLayer، ويمكن استخدامها في GTM لـGA4/Meta/TikTok.",
    },
  ];

  const search = [
    {
      label: "Sitemap",
      ok: true,
      detail: "/sitemap.xml ديناميكي ويشمل صفحات الخدمات والمناطق.",
    },
    {
      label: "Robots",
      ok: true,
      detail: "/robots.txt يسمح بالصفحات العامة ويمنع Admin/API/Customer/QR.",
    },
    {
      label: "Google verification hook",
      ok: configured(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION),
      detail:
        "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION جاهز للتحقق من URL-prefix عند الحاجة.",
    },
    {
      label: "Bing verification hook",
      ok: configured(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION),
      detail:
        "NEXT_PUBLIC_BING_SITE_VERIFICATION اختياري وجاهز بدون تعديل كود.",
    },
    {
      label: "الدومين النهائي",
      ok: customDomain(appUrl),
      detail:
        customDomain(appUrl)
          ? "NEXT_PUBLIC_APP_URL يشير لدومين مخصص."
          : "متعمد تأجيله للخطوة الأخيرة. بعده ننشئ Search Console Domain property ونرسل Sitemap.",
      state: "final" as const,
    },
  ];

  const communications = [
    {
      label: "WhatsApp Cloud",
      ok:
        String(process.env.MESSAGING_PROVIDER || "").toLowerCase() ===
          "whatsapp_cloud" &&
        configured(process.env.WHATSAPP_PHONE_NUMBER_ID) &&
        configured(process.env.WHATSAPP_ACCESS_TOKEN),
      detail:
        "الكود موجود بالفعل؛ يحتاج Meta WhatsApp Cloud credentials والقوالب المعتمدة.",
    },
    {
      label: "SMS fallback",
      ok:
        String(process.env.SMS_PROVIDER || "").toLowerCase() === "twilio" &&
        configured(process.env.TWILIO_ACCOUNT_SID) &&
        configured(process.env.TWILIO_AUTH_TOKEN) &&
        configured(process.env.TWILIO_FROM_NUMBER),
      detail: "Twilio fallback جاهز في الكود عند إضافة بيانات الحساب.",
    },
    {
      label: "Email",
      ok:
        String(process.env.EMAIL_PROVIDER || "").toLowerCase() === "resend" &&
        configured(process.env.RESEND_API_KEY) &&
        configured(process.env.EMAIL_FROM),
      detail: "Resend HTML email موجود ويعمل عند اكتمال الإعدادات.",
    },
    {
      label: "Google Reviews",
      ok: configured(process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL),
      detail:
        "NEXT_PUBLIC_GOOGLE_REVIEW_URL يُظهر CTA بعد تقييم 4-5 نجوم مع Recommendation.",
    },
  ];

  const monitoring = [
    {
      label: "Public health endpoint",
      ok: true,
      detail:
        "/api/health يفحص التطبيق وقاعدة البيانات ويمكن ربطه بـUptimeRobot/Better Stack لاحقًا.",
    },
    {
      label: "System Health",
      ok: true,
      detail: "فحص DB/Migrations/Storage/Email/Session موجود داخل Admin.",
    },
    {
      label: "Notification Health",
      ok: true,
      detail: "معدل نجاح وفشل الرسائل ومراقبة القنوات موجود بالفعل.",
    },
    {
      label: "Security Audit",
      ok: true,
      detail: "فحوصات الأمان الأساسية متاحة لـSuper Admin.",
    },
  ];

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1250,
          margin: "0 auto",
          padding: "24px 18px 70px",
        }}
      >
        <div style={headStyle}>
          <div>
            <h1 style={{ marginBottom: 6 }}>Launch Center</h1>
            <p style={{ color: "#64748b", marginTop: 0, lineHeight: 1.8 }}>
              مركز واحد يوضح ما تم تجهيزه في الكود وما يحتاج حسابًا خارجيًا،
              مع إبقاء الدومين كآخر خطوة.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/system-health" style={linkStyle}>
              صحة النظام
            </Link>
            <Link href="/admin/security-audit" style={linkStyle}>
              Security Audit
            </Link>
            <a href="/api/health" target="_blank" rel="noreferrer" style={linkStyle}>
              Health Endpoint
            </a>
          </div>
        </div>

        <Section title="القياس والتحليلات" items={measurement} />
        <Section title="SEO والفهرسة" items={search} />
        <Section title="التواصل والتقييمات" items={communications} />
        <Section title="Monitoring والأمان" items={monitoring} />

        <section style={{ ...panelStyle, marginTop: 18 }}>
          <h2 style={{ marginTop: 0 }}>الخطوات الخارجية بالترتيب</h2>

          <ol style={{ color: "#334155", lineHeight: 2 }}>
            <li>إنشاء Google Tag Manager Container والحصول على GTM ID.</li>
            <li>إنشاء GA4 Web Stream وربطه داخل GTM.</li>
            <li>إنشاء Microsoft Clarity Project وإضافة Project ID.</li>
            <li>إنشاء Meta Pixel وTikTok Pixel وربطهما داخل GTM بأحداث Ventic.</li>
            <li>تجهيز Google Business Profile ثم رابط Google Review.</li>
            <li>إنهاء WhatsApp Cloud / SMS / Email credentials والقوالب.</li>
            <li>ربط /api/health بمراقب uptime خارجي.</li>
            <li>
              آخر خطوة: الدومين → NEXT_PUBLIC_APP_URL → Search Console Domain
              property → Sitemap submission → طلب فهرسة الصفحة الرئيسية.
            </li>
          </ol>

          <p style={{ color: "#64748b", marginBottom: 0 }}>
            لا يتم عرض أي Secret أو Token في هذه الصفحة؛ الحالة فقط.
          </p>
        </section>
      </section>
    </main>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: Array<{
    label: string;
    ok: boolean;
    detail: string;
    state?: "normal" | "final";
  }>;
}) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ color: "#071a2b" }}>{title}</h2>

      <div style={gridStyle}>
        {items.map((item) => (
          <Card key={item.label} {...item} />
        ))}
      </div>
    </section>
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
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 10,
};

const panelStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 18,
};

const linkStyle: React.CSSProperties = {
  minHeight: 40,
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "0 12px",
  color: "#0f2d4a",
  background: "white",
  textDecoration: "none",
  fontWeight: 900,
};
