import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const steps = [
  {
    no: "01",
    title: "اختار الخدمة",
    text: "حدد عدد الحمامات والمطابخ والخدمة المطلوبة لكل مكان.",
  },
  {
    no: "02",
    title: "ارفع صور المكان",
    text: "الصور تساعدنا نراجع الفتحات والتجهيزات قبل الزيارة.",
  },
  {
    no: "03",
    title: "حدد الموعد",
    text: "اختار اليوم والفترة المناسبة وسجل عنوان التركيب.",
  },
  {
    no: "04",
    title: "تابع التنفيذ",
    text: "تابع حالة الطلب والفاتورة والضمان من حساب العميل.",
  },
];

const faq = [
  [
    "هل السعر الظاهر أثناء الطلب نهائي؟",
    "السعر الظاهر تقديري. يتم تأكيد مقايسة Ventic Pro قبل التنفيذ.",
  ],
  [
    "هل أقدر أرفع صور الحمام أو المطبخ؟",
    "نعم، ويمكن رفع صور مستقلة لكل مكان أثناء إنشاء الطلب.",
  ],
  [
    "إزاي أتأكد إن التركيب اتقفل رسميًا؟",
    "إتمام الطلب يتم بكود OTP يصل للعميل، ثم يتفعل الضمان ويُحدّث سجل الطلب.",
  ],
];

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

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link className="outline" href="/faq">
            الأسئلة الشائعة
          </Link>
          <Link className="outline" href="/customer">
            حساب العميل
          </Link>
          <Link
            className="button mini"
            href="/order?utm_source=Organic&utm_medium=homepage&utm_campaign=hero"
          >
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
            اطلب الخدمة أونلاين، ارفع صور المكان وحدد الموعد. نراجع التفاصيل ونوضح لك
            التكلفة قبل التنفيذ، وتتابع كل خطوة من حسابك.
          </p>

          <div className="actions">
            <Link
              className="button"
              href="/order?utm_source=Organic&utm_medium=homepage&utm_campaign=hero_primary"
            >
              ابدأ طلب تركيب
            </Link>
            <Link className="outline" href="/customer">
              متابعة طلباتي وفواتيري
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 15,
            }}
          >
            {["صور قبل وبعد", "OTP لتأكيد الإتمام", "فاتورة وضمان", "متابعة ما بعد التركيب"].map(
              (item) => (
                <span
                  key={item}
                  style={{
                    border: "1px solid #dbeafe",
                    background: "#f8fbff",
                    color: "#0f2d4a",
                    borderRadius: 999,
                    padding: "7px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  ✓ {item}
                </span>
              ),
            )}
          </div>

          <small>
            السعر أثناء الطلب تقديري، ويتم تأكيد السعر النهائي قبل التنفيذ.
          </small>
        </div>

        <div className="heroCard">
          <div className="fan">✣</div>
          <b>Ventic Pro</b>
          <span>Bathroom · Kitchen · Hood</span>
          <div
            style={{
              marginTop: 18,
              width: "100%",
              display: "grid",
              gap: 8,
            }}
          >
            {[
              ["طلب أونلاين", "في دقائق"],
              ["متابعة الطلب", "خطوة بخطوة"],
              ["التوثيق", "فاتورة + ضمان"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  background: "rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: "9px 11px",
                }}
              >
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1180,
          margin: "24px auto 0",
          padding: "0 18px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 10,
          }}
        >
          {[
            ["طلب من الموبايل", "من غير مكالمات طويلة"],
            ["مقايسة واضحة", "قبل التنفيذ"],
            ["تأكيد OTP", "عند إتمام الخدمة"],
            ["ضمان موثق", "داخل حساب العميل"],
          ].map(([title, text]) => (
            <article
              key={title}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 15,
                boxShadow: "0 6px 18px rgba(15,23,42,.04)",
              }}
            >
              <strong style={{ color: "#0f2d4a" }}>{title}</strong>
              <small style={{ display: "block", color: "#64748b", marginTop: 4 }}>
                {text}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section id="services" className="services">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "end",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="tag">اختار احتياجك</span>
            <h2>خدماتنا</h2>
          </div>
          <Link href="/faq" style={{ color: "#075985", fontWeight: 900 }}>
            عندك سؤال قبل الطلب؟
          </Link>
        </div>

        <div className="grid">
          <article>
            <div>💨</div>
            <h3>بلاور الحمام</h3>
            <p>تركيب جديد أو استبدال بلاور موجود وتحديد المقاس والتجهيزات.</p>
            <Link href="/services/bathroom-ventilation" style={serviceLink}>
              تفاصيل الخدمة ←
            </Link>
          </article>
          <article>
            <div>🍳</div>
            <h3>تهوية المطبخ</h3>
            <p>بلاورات وحلول تهوية تناسب مساحة وتجهيزات المطبخ.</p>
            <Link href="/services/kitchen-ventilation" style={serviceLink}>
              تفاصيل الخدمة ←
            </Link>
          </article>
          <article>
            <div>↗</div>
            <h3>هود وخط طرد</h3>
            <p>تركيب هود وخط طرد، مع إمكانية إضافة مروحة خارجية.</p>
            <Link href="/services/hood-exhaust" style={serviceLink}>
              تفاصيل الخدمة ←
            </Link>
          </article>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <span className="tag">من الطلب للضمان</span>
          <h2>إزاي Ventic Pro بيشتغل؟</h2>
          <p style={{ color: "#64748b" }}>
            خطوات بسيطة وواضحة، وكل خطوة بتفضل متسجلة على طلبك.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 12,
          }}
        >
          {steps.map((step) => (
            <article
              key={step.no}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 18,
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 12,
                  background: "#fff7ed",
                  color: "#ea580c",
                  fontWeight: 900,
                }}
              >
                {step.no}
              </span>
              <h3 style={{ color: "#0f2d4a", marginBottom: 5 }}>{step.title}</h3>
              <p style={{ color: "#64748b", lineHeight: 1.8, marginBottom: 0 }}>
                {step.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <div
          style={{
            background: "#0f2d4a",
            color: "white",
            borderRadius: 22,
            padding: "24px clamp(18px,4vw,34px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div>
            <span style={{ color: "#fdba74", fontWeight: 900 }}>
              تجربة منظمة من أول يوم
            </span>
            <h2 style={{ marginBottom: 8 }}>
              مش مجرد فني يركب ويمشي
            </h2>
            <p style={{ color: "#bfdbfe", lineHeight: 1.9, marginBottom: 0 }}>
              الصور، المقايسة، المدفوعات، تأكيد الإتمام، الضمان والتقييم كلها بتفضل
              مرتبطة بنفس الطلب.
            </p>
          </div>

          <div style={{ display: "grid", gap: 9 }}>
            {[
              "صور العميل قبل الزيارة",
              "صور قبل وبعد التنفيذ",
              "خامات ومدفوعات موثقة",
              "OTP لتأكيد إتمام الخدمة",
              "شهادة ضمان قابلة للطباعة",
              "متابعة صيانة وشكاوى من الحساب",
            ].map((item) => (
              <div
                key={item}
                style={{
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: 10,
                  fontWeight: 800,
                }}
              >
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
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
                review.order.customer.name.trim().split(/\s+/)[0] ||
                "عميل Ventic Pro";

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

      <section style={sectionStyle}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <span className="tag">قبل ما تبدأ</span>
          <h2>أسئلة بتتكرر</h2>
        </div>

        <div style={{ display: "grid", gap: 9 }}>
          {faq.map(([question, answer]) => (
            <details
              key={question}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 15,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  color: "#0f2d4a",
                  fontWeight: 900,
                }}
              >
                {question}
              </summary>
              <p style={{ color: "#64748b", lineHeight: 1.8, marginBottom: 0 }}>
                {answer}
              </p>
            </details>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 15 }}>
          <Link href="/faq" style={{ color: "#075985", fontWeight: 900 }}>
            شوف كل الأسئلة الشائعة ←
          </Link>
        </div>
      </section>

      <section style={sectionStyle}>
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
              اطلب الخدمة وارفع صور المكان، وسيتم توثيق كل خطوة داخل حسابك.
            </p>
          </div>
          <Link
            className="button"
            href="/order?utm_source=Organic&utm_medium=homepage&utm_campaign=bottom_cta"
          >
            إنشاء طلب جديد
          </Link>
        </div>
      </section>
    </main>
  );
}

const serviceLink: React.CSSProperties = {
  color: "#075985",
  textDecoration: "none",
  fontWeight: 900,
};

const sectionStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: "55px auto 0",
  padding: "0 18px",
};
