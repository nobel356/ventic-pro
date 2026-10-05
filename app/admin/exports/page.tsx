import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";

const exports = [
  [
    "all",
    "ملف التشغيل المالي والمخزون",
    "ملف Excel واحد بعدة Sheets: المخزون، عهد الفنيين، الحركة، الجرد، المشتريات، الفواتير والمدفوعات.",
  ],
  [
    "inventory",
    "المخزون والعهد",
    "أرصدة الشركة وعهد الفنيين وكل حركة مخزون.",
  ],
  [
    "stocktakes",
    "الجرد والفروقات",
    "ملخص جلسات الجرد وتفاصيل المتوقع والفعلي والفروقات.",
  ],
  [
    "purchases",
    "المشتريات والموردون",
    "التوريدات وبنودها وتكاليفها حسب الصلاحية.",
  ],
  [
    "accounting",
    "الحسابات",
    "الفواتير والمدفوعات والمتبقي.",
  ],
] as const;

export default async function ExportsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.EXPORTS_VIEW,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <h1 style={{ marginBottom: 6 }}>
          مركز Excel
        </h1>
        <p
          style={{
            color: "#64748b",
            marginTop: 0,
          }}
        >
          تقارير منظمة تفتح مباشرة في Excel، وكل تنزيل يتسجل باسم المستخدم في Audit Log.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(280px,1fr))",
            gap: 14,
            marginTop: 22,
          }}
        >
          {exports.map(
            ([
              type,
              title,
              description,
            ]) => (
              <article
                key={type}
                style={{
                  background: "white",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                  boxShadow:
                    "0 6px 20px rgba(15,23,42,.04)",
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  {title}
                </h2>
                <p
                  style={{
                    color: "#64748b",
                    lineHeight: 1.6,
                  }}
                >
                  {description}
                </p>
                <a
                  href={`/api/admin/exports?type=${type}`}
                  style={{
                    display:
                      "inline-flex",
                    textDecoration:
                      "none",
                    background:
                      type === "all"
                        ? "#f97316"
                        : "#0f2d4a",
                    color: "white",
                    borderRadius: 10,
                    padding:
                      "10px 13px",
                    fontWeight: 900,
                  }}
                >
                  تنزيل Excel
                </a>
              </article>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
