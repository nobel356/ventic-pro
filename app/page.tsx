import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const reviews = await prisma.review.findMany({
    where: {
      isPublished: true,
      publicConsent: true,
      overall: { gte: 4 },
      comment: { not: null },
    },
    include: {
      order: {
        select: {
          customer: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: [
      { overall: "desc" },
      { publishedAt: "desc" },
      { createdAt: "desc" },
    ],
    take: 6,
  });

  const avg =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.overall, 0) /
        reviews.length
      : 0;

  return (
    <main>
      <header>
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>
          <i>V</i> Ventic Pro
        </Link>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link className="outline" href="/customer">
            حساب العميل
          </Link>
          <Link className="button mini" href="/order">
            اطلب تركيب
          </Link>
        </div>
      </header>

      <section className="hero">
        <div>
          <span className="tag">حلول التهوية والتركيب</span>
          <h1>
            تهوية أفضل
            <br />
            <em>لحمامك ومطبخك</em>
          </h1>
          <p>
            اختار الخدمة وارفع صور المكان وحدد الموعد. نراجع التفاصيل ونوضح لك التكلفة قبل التنفيذ.
          </p>
          <div className="actions">
            <Link className="button" href="/order">
              ابدأ طلب تركيب
            </Link>
            <Link className="outline" href="/customer">
              متابعة طلباتي وفواتيري
            </Link>
          </div>
          <small>
            ✓ السعر المعروض أثناء الطلب تقديري ويتم تأكيد السعر النهائي قبل التنفيذ.
          </small>
        </div>

        <div className="heroCard">
          <div className="fan">✣</div>
          <b>Ventic Pro</b>
          <span>Bathroom · Kitchen · Hood</span>
        </div>
      </section>

      <section id="services" className="services">
        <h2>خدماتنا</h2>
        <div className="grid">
          <article>
            <div>💨</div>
            <h3>بلاور الحمام</h3>
            <p>
              تركيب جديد أو استبدال بلاور موجود وتحديد المقاس والتجهيزات.
            </p>
          </article>
          <article>
            <div>🍳</div>
            <h3>تهوية المطبخ</h3>
            <p>
              بلاورات وحلول تهوية تناسب مساحة وتجهيزات المطبخ.
            </p>
          </article>
          <article>
            <div>↗</div>
            <h3>هود وخط طرد</h3>
            <p>
              تركيب هود وخط طرد، مع إمكانية إضافة مروحة خارجية.
            </p>
          </article>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1180,
          margin: "55px auto 0",
          padding: "0 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "end",
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <span className="tag">ثقة مبنية على تجربة حقيقية</span>
            <h2 style={{ marginBottom: 4 }}>آراء عملائنا</h2>
            <p style={{ color: "#64748b", margin: 0 }}>
              لا ننشر تعليقًا إلا بعد موافقة العميل ومراجعة Ventic Pro.
            </p>
          </div>

          {reviews.length > 0 && (
            <div
              style={{
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: 14,
                padding: "10px 14px",
                color: "#9a3412",
                fontWeight: 900,
              }}
            >
              ★ {avg.toFixed(1)} / 5
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <div
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              color: "#64748b",
            }}
          >
            تقييمات العملاء المعتمدة ستظهر هنا قريبًا.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 12,
            }}
          >
            {reviews.map((review) => {
              const firstName =
                review.order.customer.name.trim().split(/\s+/)[0] || "عميل Ventic Pro";

              return (
                <article
                  key={review.id}
                  style={{
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 16,
                    padding: 18,
                    boxShadow: "0 8px 24px rgba(15,23,42,.05)",
                  }}
                >
                  <div style={{ color: "#f59e0b", fontSize: 21 }}>
                    {"★".repeat(review.overall)}
                    <span style={{ color: "#cbd5e1" }}>
                      {"★".repeat(5 - review.overall)}
                    </span>
                  </div>
                  <p style={{ lineHeight: 1.8, color: "#334155" }}>
                    “{review.comment}”
                  </p>
                  <strong style={{ color: "#0f2d4a" }}>{firstName}</strong>
                  <small style={{ display: "block", color: "#64748b", marginTop: 3 }}>
                    عميل Ventic Pro
                  </small>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        style={{
          maxWidth: 1180,
          margin: "55px auto 0",
          padding: "0 18px",
        }}
      >
        <div
          style={{
            background: "#0f2d4a",
            color: "white",
            borderRadius: 20,
            padding: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>جاهز تبدأ؟</h2>
            <p style={{ color: "#bfdbfe", marginBottom: 0 }}>
              اطلب الخدمة وارفع صور المكان وسيتم توثيق كل خطوة داخل حسابك.
            </p>
          </div>
          <Link className="button" href="/order">
            إنشاء طلب جديد
          </Link>
        </div>
      </section>
    </main>
  );
}
