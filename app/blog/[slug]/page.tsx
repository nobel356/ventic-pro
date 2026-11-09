import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleVisual from "@/app/blog/ArticleVisual";
import PortfolioGallery from "@/app/shared/PortfolioGallery";
import {
  blogArticles,
  getBlogArticle,
  relatedBlogArticles,
} from "@/lib/blog/articles";

export function generateStaticParams() {
  return blogArticles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) return {};

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url: `/blog/${article.slug}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      images: [
        {
          url: "/social-preview.png",
          width: 1200,
          height: 630,
          alt: `${article.title} - Ventic Pro`,
        },
      ],
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) notFound();

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ventic-pro.com"
  ).replace(/\/$/, "");

  const articleUrl = `${baseUrl}/blog/${article.slug}`;
  const related = relatedBlogArticles(article);

  const workTerms =
    article.category.includes("الحمامات")
      ? ["حمام", "بلاور", "تهوية", "كور"]
      : article.category.includes("المطابخ")
        ? ["مطبخ", "هود", "تهوية"]
        : article.category.includes("هود")
          ? ["هود", "خط طرد", "مطبخ"]
          : ["تركيب", "تهوية", "هود"];

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${articleUrl}#article`,
    mainEntityOfPage: articleUrl,
    headline: article.title,
    description: article.description,
    image: [`${baseUrl}/blog/visuals/${article.slug}.svg`],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "ar-EG",
    articleSection: article.category,
    author: {
      "@type": "Organization",
      "@id": `${baseUrl}/#business`,
      name: "Ventic Pro",
      url: baseUrl,
    },
    publisher: {
      "@id": `${baseUrl}/#business`,
    },
    isPartOf: {
      "@id": `${baseUrl}/#website`,
    },
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
        name: "دليل التهوية",
        item: `${baseUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <main dir="rtl" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <article style={{ maxWidth: 900, margin: "0 auto", padding: "82px 18px 50px" }}>
        <nav aria-label="مسار الصفحة" style={crumbs}>
          <Link href="/" style={crumbLink}>الرئيسية</Link>
          <span>‹</span>
          <Link href="/blog" style={crumbLink}>دليل التهوية</Link>
          <span>‹</span>
          <span>{article.category}</span>
        </nav>

        <header style={headerCard}>
          <div style={metaRow}>
            <span style={tag}>{article.category}</span>
            <span>{article.readingMinutes} دقائق قراءة</span>
            <span>نُشر {new Date(article.publishedAt).toLocaleDateString("ar-EG")}</span>
          </div>
          <h1 style={h1}>{article.title}</h1>
          <p style={dek}>{article.description}</p>

          <div style={editorialNote}>
            <strong>ملاحظة تحريرية:</strong>{" "}
            هذا دليل تعليمي مبني على مراجع مهنية ومبادئ تركيب عامة. القرار النهائي
            يتأكد بعد مراجعة موديل الجهاز ومسار الدكت وصور المكان، ولا يُستخدم بدل
            تعليمات الشركة المصنّعة أو متطلبات السلامة المحلية.
          </div>
        </header>

        <ArticleVisual
          slug={article.slug}
          title={article.title}
        />

        <div style={articleBody}>
          {article.sections.map((section) => (
            <section key={section.heading} style={sectionStyle}>
              <h2 style={h2}>{section.heading}</h2>

              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} style={paragraphStyle}>{paragraph}</p>
              ))}

              {section.bullets.length > 0 && (
                <ul style={listStyle}>
                  {section.bullets.map((item) => (
                    <li key={item} style={{ marginBottom: 8 }}>{item}</li>
                  ))}
                </ul>
              )}

              {section.note && <div style={noteStyle}>{section.note}</div>}
            </section>
          ))}
        </div>

        {article.faq.length > 0 && (
          <section style={faqWrap}>
            <h2 style={h2}>أسئلة شائعة</h2>
            <div style={{ display: "grid", gap: 9 }}>
              {article.faq.map(([question, answer]) => (
                <details key={question} style={faqItem}>
                  <summary style={faqSummary}>{question}</summary>
                  <p style={{ ...paragraphStyle, marginBottom: 0 }}>{answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {article.sources.length > 0 && (
          <section style={sourcesWrap}>
            <h2 style={{ ...h2, fontSize: 22 }}>مراجع فنية</h2>
            <p style={{ ...paragraphStyle, fontSize: 14 }}>
              استخدمنا المراجع التالية للتحقق من المبادئ والأرقام الإرشادية. مواصفات
              المنتج الفعلي وتعليمات الشركة المصنّعة تظل المرجع الأول أثناء التنفيذ.
            </p>
            <div style={{ display: "grid", gap: 7 }}>
              {article.sources.map(([label, url]) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" style={sourceLink}>
                  {label} ↗
                </a>
              ))}
            </div>
          </section>
        )}

        <PortfolioGallery
          limit={2}
          showAllLink
          matchTerms={workTerms}
          contextTitle="تنفيذات Ventic Pro المرتبطة بالموضوع"
        />

        <section style={serviceCta}>
          <div>
            <span style={{ color: "#7dd3fc", fontWeight: 900, fontSize: 12 }}>
              حوّل المعلومة لقرار
            </span>
            <h2 style={{ margin: "5px 0 7px" }}>{article.serviceLabel}</h2>
            <p style={{ color: "#c8e2f0", lineHeight: 1.8, margin: 0 }}>
              ارفع صور المكان أو استخدم الحاسبة لو عايز تقدير أولي قبل التنفيذ.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="button" href={article.serviceHref}>شوف الخدمة</Link>
            <Link className="outline" href="/calculator" style={{ background: "white" }}>
              احسب سعر مبدئي
            </Link>
            <Link className="outline" href="/order" style={{ background: "white" }}>
              ابدأ طلب
            </Link>
          </div>
        </section>

        <section style={{ marginTop: 35 }}>
          <h2 style={h2}>اقرأ كمان</h2>
          <div style={relatedGrid}>
            {related.map((item) => (
              <Link key={item.slug} href={`/blog/${item.slug}`} style={relatedCard}>
                <small style={{ color: "#0284c7", fontWeight: 900 }}>{item.category}</small>
                <strong style={{ color: "#0b2f49", lineHeight: 1.6 }}>{item.title}</strong>
                <span style={{ color: "#075985", fontWeight: 900 }}>اقرأ ←</span>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}

const crumbs: React.CSSProperties = { display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", color: "#64748b", fontSize: 12, marginBottom: 14 };
const crumbLink: React.CSSProperties = { color: "#075985", textDecoration: "none", fontWeight: 800 };
const headerCard: React.CSSProperties = { background: "linear-gradient(145deg,#f8fcff,#eef8fd)", border: "1px solid #d7e9f3", borderRadius: 24, padding: "clamp(22px,5vw,42px)" };
const metaRow: React.CSSProperties = { display: "flex", gap: 9, flexWrap: "wrap", color: "#64748b", fontSize: 12, alignItems: "center" };
const tag: React.CSSProperties = { color: "#075985", background: "#e0f2fe", borderRadius: 999, padding: "5px 9px", fontWeight: 900 };
const h1: React.CSSProperties = { color: "#071a2b", fontSize: "clamp(34px,6vw,56px)", lineHeight: 1.25, margin: "13px 0 12px" };
const dek: React.CSSProperties = { color: "#475569", lineHeight: 1.95, fontSize: 17, maxWidth: 800 };
const editorialNote: React.CSSProperties = { marginTop: 18, background: "white", border: "1px solid #dbe7ef", borderRadius: 13, padding: 13, color: "#526477", fontSize: 13, lineHeight: 1.8 };
const articleBody: React.CSSProperties = { marginTop: 28 };
const sectionStyle: React.CSSProperties = { marginTop: 31 };
const h2: React.CSSProperties = { color: "#0b2f49", fontSize: "clamp(25px,4vw,32px)", lineHeight: 1.45, marginBottom: 10 };
const paragraphStyle: React.CSSProperties = { color: "#334155", lineHeight: 2, fontSize: 16 };
const listStyle: React.CSSProperties = { color: "#334155", lineHeight: 1.9, paddingRight: 23 };
const noteStyle: React.CSSProperties = { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 13, padding: 14, color: "#9a3412", lineHeight: 1.8, fontWeight: 700, marginTop: 12 };
const faqWrap: React.CSSProperties = { marginTop: 38, borderTop: "1px solid #e2e8f0", paddingTop: 25 };
const faqItem: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 13, padding: 14 };
const faqSummary: React.CSSProperties = { cursor: "pointer", color: "#0b2f49", fontWeight: 900 };
const sourcesWrap: React.CSSProperties = { marginTop: 33, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 16, padding: 17 };
const sourceLink: React.CSSProperties = { color: "#075985", textDecoration: "none", fontWeight: 800, fontSize: 13 };
const serviceCta: React.CSSProperties = { marginTop: 36, background: "#0b2f49", color: "white", borderRadius: 21, padding: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" };
const relatedGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 };
const relatedCard: React.CSSProperties = { background: "white", border: "1px solid #dbe7ef", borderRadius: 14, padding: 15, textDecoration: "none", display: "grid", gap: 7 };
