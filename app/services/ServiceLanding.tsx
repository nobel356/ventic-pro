import Link from "next/link";
import { prisma } from "@/lib/prisma";

type FAQ = [string, string];

export default async function ServiceLanding({
  slug,
  eyebrow,
  title,
  description,
  serviceCodes,
  benefits,
  checks,
  steps,
  included,
  possibleExtras,
  faqs,
}: {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  serviceCodes: string[];
  benefits: string[];
  checks: string[];
  steps: string[];
  included: string[];
  possibleExtras: string[];
  faqs: FAQ[];
}) {
  const services = await prisma.service.findMany({
    where: {
      code: { in: serviceCodes },
      active: true,
      customerVisible: true,
    },
    select: {
      code: true,
      nameAr: true,
      priceFrom: true,
      priceTo: true,
    },
    orderBy: { priceFrom: "asc" },
  });

  const visiblePrices = services
    .map((item) => Number(item.priceFrom))
    .filter((value) => Number.isFinite(value) && value > 0);

  const priceFrom = visiblePrices.length ? Math.min(...visiblePrices) : null;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    provider: {
      "@type": "HomeAndConstructionBusiness",
      name: "Ventic Pro",
    },
    description,
    ...(priceFrom
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "EGP",
            price: priceFrom,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section style={heroWrap}>
        <div style={heroCard}>
          <span style={eyebrowStyle}>{eyebrow}</span>
          <h1 style={heroTitle}>{title}</h1>
          <p style={heroText}>{description}</p>

          {priceFrom !== null && (
            <div style={priceBox}>
              <small>أسعار الخدمات المرتبطة تبدأ من</small>
              <strong>{priceFrom.toLocaleString("ar-EG")} جنيه</strong>
              <span>السعر النهائي يتأكد بعد مراجعة تفاصيل المكان.</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 18 }}>
            <Link
              className="button"
              href={`/order?utm_source=Organic&utm_medium=service_page&utm_campaign=${slug}`}
              data-track="order_intent"
              data-track-label={slug}
            >
              اطلب الخدمة
            </Link>
            <Link
              className="outline"
              href={`/callback?service=${encodeURIComponent(title)}`}
              data-track="callback_intent"
              data-track-label={slug}
            >
              خلّينا نكلّمك
            </Link>
            <Link className="outline" href="/calculator">
              احسب سعر مبدئي
            </Link>
            <Link className="outline" href="/works">
              شوف أعمالنا
            </Link>
          </div>
        </div>
      </section>

      {services.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>الأسعار الحالية داخل النظام</h2>
          <div style={gridStyle}>
            {services.map((item) => {
              const from = Number(item.priceFrom);
              const to = item.priceTo === null ? null : Number(item.priceTo);
              return (
                <article key={item.code} style={cardStyle}>
                  <strong style={{ color: "#0b2f49" }}>{item.nameAr}</strong>
                  <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 18 }}>
                    {to && to !== from
                      ? `${from.toLocaleString("ar-EG")} - ${to.toLocaleString("ar-EG")} ج`
                      : `${from.toLocaleString("ar-EG")} ج`}
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      )}

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
        <h2 style={headingStyle}>رحلة التنفيذ</h2>
        <div style={gridStyle}>
          {steps.map((item, index) => (
            <article key={item} style={cardStyle}>
              <span style={{ ...checkIcon, background: "#eef8fd", color: "#075985" }}>
                {index + 1}
              </span>
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
              <span style={{ ...checkIcon, background: "#eef8fd", color: "#075985" }}>
                {index + 1}
              </span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={twoColStyle}>
          <div style={includedStyle}>
            <h2 style={{ marginTop: 0, color: "#166534" }}>عادةً يشمل</h2>
            {included.map((item) => (
              <p key={item} style={listLine}>✓ {item}</p>
            ))}
          </div>
          <div style={extraStyle}>
            <h2 style={{ marginTop: 0, color: "#9a3412" }}>قد يحتاج تكلفة إضافية</h2>
            {possibleExtras.map((item) => (
              <p key={item} style={listLine}>○ {item}</p>
            ))}
          </div>
        </div>
        <p style={{ color: "#64748b", lineHeight: 1.8, marginTop: 14 }}>
          أي إضافة يتم توضيح سببها ومبلغها قبل اعتمادها، والسعر الظاهر أثناء الطلب يظل تقديريًا حتى مراجعة الصور ومتطلبات المكان.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>الأسئلة الشائعة</h2>
        <div style={{ display: "grid", gap: 9 }}>
          {faqs.map(([question, answer]) => (
            <details key={question} style={faqStyle}>
              <summary style={{ color: "#0b2f49", fontWeight: 900, cursor: "pointer" }}>
                {question}
              </summary>
              <p style={{ color: "#64748b", lineHeight: 1.8, marginBottom: 0 }}>
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section style={{ ...sectionStyle, paddingBottom: 25 }}>
        <div style={ctaStyle}>
          <div>
            <h2 style={{ margin: 0 }}>مش متأكد أنهي حل يناسب مكانك؟</h2>
            <p style={{ color: "#c8e2f0", lineHeight: 1.8, marginBottom: 0 }}>
              ابعت صور المكان في الطلب أو سيب رقمك وإحنا نتواصل معاك.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="button" href="/order">ابدأ الطلب</Link>
            <Link className="outline" href={`/callback?service=${encodeURIComponent(title)}`} style={{ background: "white" }}>
              اطلب مكالمة
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const heroWrap: React.CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "90px 18px 26px" };
const heroCard: React.CSSProperties = { background: "linear-gradient(145deg,#f7fbfe,#eef8fd)", border: "1px solid #d7e9f3", borderRadius: 26, padding: "clamp(24px,5vw,48px)" };
const eyebrowStyle: React.CSSProperties = { color: "#0284c7", fontWeight: 900, fontSize: 13 };
const heroTitle: React.CSSProperties = { color: "#071a2b", fontSize: "clamp(36px,7vw,62px)", lineHeight: 1.12, maxWidth: 850, margin: "8px 0 14px" };
const heroText: React.CSSProperties = { color: "#475569", lineHeight: 1.9, fontSize: 17, maxWidth: 800 };
const priceBox: React.CSSProperties = { display: "inline-grid", gap: 3, background: "white", border: "1px solid #bfdbfe", borderRadius: 14, padding: "11px 14px", marginTop: 8, color: "#475569" };
const sectionStyle: React.CSSProperties = { maxWidth: 1180, margin: "38px auto 0", padding: "0 18px" };
const headingStyle: React.CSSProperties = { color: "#071a2b", fontSize: "clamp(26px,4vw,34px)", marginBottom: 15 };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 };
const cardStyle: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 15, padding: 16, display: "flex", alignItems: "center", gap: 10, color: "#0f2d4a" };
const checkIcon: React.CSSProperties = { width: 31, height: 31, flex: "0 0 31px", display: "grid", placeItems: "center", borderRadius: 9, background: "#dcfce7", color: "#166534", fontWeight: 900 };
const twoColStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 };
const includedStyle: React.CSSProperties = { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 16, padding: 17 };
const extraStyle: React.CSSProperties = { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, padding: 17 };
const listLine: React.CSSProperties = { margin: "7px 0", color: "#475569", lineHeight: 1.7 };
const faqStyle: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px" };
const ctaStyle: React.CSSProperties = { background: "#0b2f49", color: "white", borderRadius: 22, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap" };
