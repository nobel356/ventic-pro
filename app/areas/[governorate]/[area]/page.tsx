import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublishedBlogArticles } from "@/lib/blog/cms";

export const dynamic = "force-dynamic";

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function asFaq(value: unknown): [string, string][] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is [string, string] =>
      Array.isArray(item) &&
      item.length >= 2 &&
      typeof item[0] === "string" &&
      typeof item[1] === "string",
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ governorate: string; area: string }>;
}): Promise<Metadata> {
  const raw = await params;
  const governorate = decode(raw.governorate);
  const area = decode(raw.area);

  const serviceArea = await prisma.serviceArea.findFirst({
    where: {
      active: true,
      governorate,
      area,
    },
    select: {
      seoPublished: true,
      seoTitle: true,
      seoDescription: true,
    },
  });

  if (!serviceArea) {
    return {};
  }

  const canonical =
    "/areas/" +
    encodeURIComponent(governorate) +
    "/" +
    encodeURIComponent(area);

  const indexed = serviceArea.seoPublished;

  return {
    title:
      (indexed && serviceArea.seoTitle) ||
      `خدمات Ventic Pro في ${area} - ${governorate}`,
    description:
      (indexed && serviceArea.seoDescription) ||
      `تعرف على توافر خدمات Ventic Pro في ${area}، ${governorate} ورسوم الانتقال وأيام الخدمة.`,
    alternates: {
      canonical,
    },
    robots: indexed
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
          },
        },
    openGraph: indexed
      ? {
          title:
            serviceArea.seoTitle ||
            `خدمات Ventic Pro في ${area}`,
          description:
            serviceArea.seoDescription || undefined,
          type: "website",
          url: canonical,
        }
      : undefined,
  };
}

export default async function AreaLandingPage({
  params,
}: {
  params: Promise<{ governorate: string; area: string }>;
}) {
  const raw = await params;
  const governorate = decode(raw.governorate);
  const area = decode(raw.area);

  const serviceArea = await prisma.serviceArea.findFirst({
    where: {
      active: true,
      governorate,
      area,
    },
  });

  if (!serviceArea) notFound();

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ventic-pro.com"
  ).replace(/\/$/, "");

  const canonicalPath =
    "/areas/" +
    encodeURIComponent(governorate) +
    "/" +
    encodeURIComponent(area);

  const pageUrl = baseUrl + canonicalPath;
  const fee = Number(serviceArea.travelFee || 0);
  const faq = asFaq(serviceArea.seoFaq);
  const highlights = serviceArea.seoHighlights || [];

  const articles = await getPublishedBlogArticles();
  const relatedArticles = articles
    .filter((article) =>
      [
        "تهوية الحمامات",
        "تهوية المطابخ",
        "هود وخطوط الطرد",
      ].includes(article.category),
    )
    .slice(0, 3);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": pageUrl + "#service",
    url: pageUrl,
    name:
      serviceArea.seoTitle ||
      `خدمات Ventic Pro في ${area}`,
    serviceType: "خدمات التهوية والتركيب",
    areaServed: {
      "@type": "AdministrativeArea",
      name: `${area}, ${governorate}`,
    },
    provider: {
      "@id": baseUrl + "/#business",
    },
    description:
      serviceArea.seoDescription ||
      `خدمات تهوية وتركيب متاحة في ${area}، ${governorate}.`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ventic Pro",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "مناطق الخدمة",
        item: baseUrl + "/areas",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: area,
        item: pageUrl,
      },
    ],
  };

  const faqSchema =
    serviceArea.seoPublished && faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map(([question, answer]) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: {
              "@type": "Answer",
              text: answer,
            },
          })),
        }
      : null;

  const blogUtm =
    "utm_source=Organic&utm_medium=local_seo&utm_campaign=" +
    encodeURIComponent(area);

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
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema),
          }}
        />
      )}

      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "90px 18px 50px",
        }}
      >
        <nav
          aria-label="مسار الصفحة"
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            color: "#64748b",
            fontSize: 12,
            marginBottom: 13,
          }}
        >
          <Link href="/" style={crumbLink}>
            الرئيسية
          </Link>
          <span>‹</span>
          <Link href="/areas" style={crumbLink}>
            مناطق الخدمة
          </Link>
          <span>‹</span>
          <span>{area}</span>
        </nav>

        <span
          style={{
            color: "#0284c7",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {governorate}
        </span>

        <h1
          style={{
            color: "#071a2b",
            fontSize: "clamp(36px,7vw,58px)",
            margin: "7px 0 12px",
            lineHeight: 1.2,
          }}
        >
          {serviceArea.seoPublished && serviceArea.seoTitle
            ? serviceArea.seoTitle
            : `خدمات Ventic Pro في ${area}`}
        </h1>

        <p
          style={{
            color: "#64748b",
            lineHeight: 1.95,
            maxWidth: 800,
            fontSize: 16,
          }}
        >
          {serviceArea.seoPublished && serviceArea.seoIntro
            ? serviceArea.seoIntro
            : `تقدر تطلب خدمات Ventic Pro في ${area}. الصفحة دي توضح حالة التغطية ورسوم الانتقال وأيام الخدمة، وفريقنا يؤكد تفاصيل التنفيذ بعد مراجعة المكان.`}
        </p>

        <div style={infoGrid}>
          <Info
            label="رسوم الانتقال"
            value={
              fee > 0
                ? `${fee.toLocaleString("ar-EG")} جنيه`
                : "بدون رسوم انتقال مسجلة"
            }
          />
          <Info
            label="أيام الخدمة"
            value={
              serviceArea.serviceDays ||
              "يتم تأكيدها مع الطلب"
            }
          />
          <Info
            label="الحالة"
            value="متاحة حاليًا"
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 18,
          }}
        >
          <Link
            className="button"
            href={"/order?" + blogUtm}
            data-track="order_intent"
            data-track-label={"area:" + area}
          >
            اطلب خدمة في {area}
          </Link>

          <Link
            className="outline"
            href={
              "/callback?service=" +
              encodeURIComponent(
                "خدمة في " + area,
              )
            }
          >
            اسألنا قبل الطلب
          </Link>

          <Link
            className="outline"
            href="/works"
          >
            شوف أعمالنا
          </Link>
        </div>

        {serviceArea.seoPublished &&
          highlights.length > 0 && (
            <section style={{ marginTop: 38 }}>
              <h2 style={h2}>
                معلومات مهمة قبل التنفيذ في {area}
              </h2>
              <div style={highlightGrid}>
                {highlights.map((item) => (
                  <div key={item} style={highlightCard}>
                    <span style={check}>✓</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

        <section style={{ marginTop: 42 }}>
          <h2 style={h2}>
            الخدمات المتاحة في {area}
          </h2>
          <div style={serviceGrid}>
            <Service
              href="/services/bathroom-ventilation"
              label="تهوية الحمامات"
            />
            <Service
              href="/services/kitchen-ventilation"
              label="تهوية المطابخ"
            />
            <Service
              href="/services/hood-exhaust"
              label="هود وخطوط الطرد"
            />
            <Service
              href="/calculator"
              label="حاسبة السعر التقديري"
            />
          </div>
        </section>

        {serviceArea.seoPublished &&
          faq.length > 0 && (
            <section style={{ marginTop: 42 }}>
              <h2 style={h2}>
                أسئلة شائعة عن الخدمة في {area}
              </h2>
              <div
                style={{
                  display: "grid",
                  gap: 9,
                }}
              >
                {faq.map(([question, answer]) => (
                  <details
                    key={question}
                    style={faqStyle}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        color: "#0b2f49",
                        fontWeight: 900,
                      }}
                    >
                      {question}
                    </summary>
                    <p
                      style={{
                        color: "#64748b",
                        lineHeight: 1.85,
                        marginBottom: 0,
                      }}
                    >
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

        {serviceArea.seoPublished &&
          relatedArticles.length > 0 && (
            <section style={{ marginTop: 42 }}>
              <h2 style={h2}>
                اقرأ قبل ما تختار نظام التهوية
              </h2>
              <div style={articleGrid}>
                {relatedArticles.map((article) => (
                  <Link
                    key={article.slug}
                    href={"/blog/" + article.slug}
                    style={articleCard}
                  >
                    <small
                      style={{
                        color: "#0284c7",
                        fontWeight: 900,
                      }}
                    >
                      {article.category}
                    </small>
                    <strong
                      style={{
                        color: "#0b2f49",
                        lineHeight: 1.6,
                      }}
                    >
                      {article.title}
                    </strong>
                    <span
                      style={{
                        color: "#075985",
                        fontWeight: 900,
                      }}
                    >
                      اقرأ ←
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
      </section>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={infoStyle}>
      <small style={{ color: "#64748b" }}>
        {label}
      </small>
      <strong
        style={{
          display: "block",
          marginTop: 4,
          color: "#0b2f49",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Service({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href} style={serviceStyle}>
      <strong>{label}</strong>
      <span>←</span>
    </Link>
  );
}

const crumbLink: React.CSSProperties = {
  color: "#075985",
  textDecoration: "none",
  fontWeight: 800,
};
const h2: React.CSSProperties = {
  color: "#071a2b",
  fontSize: "clamp(25px,4vw,32px)",
};
const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 10,
  marginTop: 22,
};
const infoStyle: React.CSSProperties = {
  background: "#f8fbfd",
  border: "1px solid #dbe7ef",
  borderRadius: 14,
  padding: 14,
};
const serviceGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 10,
};
const serviceStyle: React.CSSProperties = {
  minHeight: 72,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 14,
  padding: 15,
  color: "#0b2f49",
  textDecoration: "none",
};
const highlightGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(230px,1fr))",
  gap: 9,
};
const highlightCard: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  padding: 13,
  color: "#334155",
};
const check: React.CSSProperties = {
  width: 30,
  height: 30,
  flex: "0 0 30px",
  display: "grid",
  placeItems: "center",
  borderRadius: 9,
  background: "#dcfce7",
  color: "#166534",
  fontWeight: 900,
};
const faqStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  padding: 14,
};
const articleGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(230px,1fr))",
  gap: 10,
};
const articleCard: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 14,
  padding: 15,
  display: "grid",
  gap: 7,
  textDecoration: "none",
};
