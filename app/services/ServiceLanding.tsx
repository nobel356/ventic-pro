import Link from "next/link";

type FAQ = [string, string];

export default function ServiceLanding({
  slug,
  eyebrow,
  title,
  description,
  benefits,
  checks,
  faqs,
}: {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  benefits: string[];
  checks: string[];
  faqs: FAQ[];
}) {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    provider: {
      "@type": "Organization",
      name: "Ventic Pro",
    },
    description,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };

  return (
    <main dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "90px 18px 26px",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(145deg,#f7fbfe,#eef8fd)",
            border: "1px solid #d7e9f3",
            borderRadius: 26,
            padding: "clamp(24px,5vw,48px)",
          }}
        >
          <span
            style={{
              color: "#0284c7",
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            {eyebrow}
          </span>

          <h1
            style={{
              color: "#071a2b",
              fontSize: "clamp(36px,7vw,62px)",
              lineHeight: 1.12,
              maxWidth: 850,
              margin: "8px 0 14px",
            }}
          >
            {title}
          </h1>

          <p
            style={{
              color: "#475569",
              lineHeight: 1.9,
              fontSize: 17,
              maxWidth: 800,
            }}
          >
            {description}
          </p>

          <div
            style={{
              display: "flex",
              gap: 9,
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <Link
              className="button"
              href={`/order?utm_source=Organic&utm_medium=service_page&utm_campaign=${slug}`}
            >
              اطلب الخدمة
            </Link>

            <Link
              className="outline"
              href={`/callback?service=${encodeURIComponent(title)}`}
            >
              خلّينا نكلّمك
            </Link>

            <Link className="outline" href="/works">
              شوف أعمالنا
            </Link>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>ليه الخدمة دي مهمة؟</h2>

        <div style={gridStyle}>
          {benefits.map((item) => (
            <article key={item} style={cardStyle}>
              <span style={checkIcon}>✓</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>بنراجع إيه قبل التنفيذ؟</h2>

        <div style={gridStyle}>
          {checks.map((item, index) => (
            <article key={item} style={cardStyle}>
              <span
                style={{
                  ...checkIcon,
                  background: "#eef8fd",
                  color: "#075985",
                }}
              >
                {index + 1}
              </span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>

        <p
          style={{
            color: "#64748b",
            lineHeight: 1.8,
            marginTop: 14,
          }}
        >
          التكلفة الظاهرة أثناء الطلب تقديرية، ويتم تأكيد التفاصيل والسعر النهائي قبل التنفيذ بعد مراجعة صور المكان ومتطلبات التركيب.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>الأسئلة الشائعة</h2>

        <div style={{ display: "grid", gap: 9 }}>
          {faqs.map(([question, answer]) => (
            <details
              key={question}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "14px 16px",
              }}
            >
              <summary
                style={{
                  color: "#0b2f49",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {question}
              </summary>

              <p
                style={{
                  color: "#64748b",
                  lineHeight: 1.8,
                  marginBottom: 0,
                }}
              >
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section
        style={{
          ...sectionStyle,
          paddingBottom: 25,
        }}
      >
        <div
          style={{
            background: "#0b2f49",
            color: "white",
            borderRadius: 22,
            padding: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 15,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>مش متأكد أنهي حل يناسب مكانك؟</h2>
            <p
              style={{
                color: "#c8e2f0",
                lineHeight: 1.8,
                marginBottom: 0,
              }}
            >
              ابعت صور المكان في الطلب أو سيب رقمك وإحنا نتواصل معاك.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="button" href="/order">
              ابدأ الطلب
            </Link>
            <Link
              className="outline"
              href={`/callback?service=${encodeURIComponent(title)}`}
              style={{ background: "white" }}
            >
              اطلب مكالمة
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: "38px auto 0",
  padding: "0 18px",
};

const headingStyle: React.CSSProperties = {
  color: "#071a2b",
  fontSize: "clamp(26px,4vw,34px)",
  marginBottom: 15,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: 10,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 15,
  padding: 16,
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#0f2d4a",
};

const checkIcon: React.CSSProperties = {
  width: 31,
  height: 31,
  flex: "0 0 31px",
  display: "grid",
  placeItems: "center",
  borderRadius: 9,
  background: "#dcfce7",
  color: "#166534",
  fontWeight: 900,
};
