export const revalidate = 60;
import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBlogArticles } from "@/lib/blog/cms";
import { blogCategories } from "@/lib/blog/categories";

export const metadata: Metadata = {
  title: "دليل التهوية",
  description:
    "مقالات عملية عن تهوية الحمامات والمطابخ والهود وخطوط الطرد: اختيار الشفاط، قوة السحب، الدكت، الأكواع، الرطوبة والروائح.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "دليل التهوية | Ventic Pro",
    description:
      "أدلة عملية تساعدك تختار حل التهوية المناسب قبل الشراء أو التركيب.",
    url: "/blog",
    type: "website",
  },
};

export default async function BlogPage() {
  const articles = await getPublishedBlogArticles();
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ventic-pro.com"
  ).replace(/\/$/, "");

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${baseUrl}/blog#collection`,
    url: `${baseUrl}/blog`,
    name: "دليل التهوية - Ventic Pro",
    inLanguage: "ar-EG",
    isPartOf: { "@id": `${baseUrl}/#website` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${baseUrl}/blog/${article.slug}`,
        name: article.title,
      })),
    },
  };

  const categories = blogCategories;

  return (
    <main dir="rtl" style={{ background: "#f5f8fb", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "88px 18px 55px" }}>
        <span style={eyebrow}>دليل Ventic Pro</span>
        <h1 style={titleStyle}>كل اللي تحتاج تعرفه عن التهوية قبل التركيب</h1>
        <p style={leadStyle}>
          شرح عملي للحمامات والمطابخ والهود وخطوط الطرد. الهدف إنك تفهم المشكلة
          وتعرف الأسئلة الصح قبل ما تشتري جهاز أو تعمل فتحة أو تمد دكت.
        </p>

        <div style={categoryRow}>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={"/blog/category/" + category.slug}
              style={categoryPill}
            >
              {category.name}
            </Link>
          ))}
        </div>

        <div style={grid}>
          {articles.map((article, index) => (
            <article key={article.slug} style={card}>
              <div style={cardTop}>
                <span style={articleTag}>{article.category}</span>
                <span style={reading}>{article.readingMinutes} دقائق قراءة</span>
              </div>
              <h2 style={cardTitle}>{article.title}</h2>
              <p style={cardText}>{article.excerpt}</p>
              <div style={cardActions}>
                <Link href={`/blog/${article.slug}`} style={readLink}>
                  اقرأ الدليل ←
                </Link>
                {index < 3 && <span style={featured}>مقترح للبداية</span>}
              </div>
            </article>
          ))}
        </div>

        <section style={cta}>
          <div>
            <strong style={{ fontSize: 22 }}>مش عارف تبدأ منين؟</strong>
            <p style={{ color: "#c8e2f0", marginBottom: 0, lineHeight: 1.8 }}>
              استخدم حاسبة السعر أو ارفع صور المكان في الطلب، ونراجع التفاصيل قبل التنفيذ.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="button" href="/calculator">حاسبة السعر</Link>
            <Link className="outline" href="/order" style={{ background: "white" }}>
              ابدأ طلب
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

const eyebrow: React.CSSProperties = { color: "#0284c7", fontWeight: 900, fontSize: 13 };
const titleStyle: React.CSSProperties = { color: "#071a2b", fontSize: "clamp(38px,7vw,64px)", lineHeight: 1.12, maxWidth: 900, margin: "8px 0 14px" };
const leadStyle: React.CSSProperties = { color: "#475569", lineHeight: 1.95, fontSize: 17, maxWidth: 800 };
const categoryRow: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", margin: "18px 0 26px" };
const categoryPill: React.CSSProperties = { background: "#e0f2fe", color: "#075985", border: "1px solid #bae6fd", borderRadius: 999, padding: "7px 11px", fontSize: 12, fontWeight: 900 };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(285px,1fr))", gap: 14 };
const card: React.CSSProperties = { background: "white", border: "1px solid #dbe7ef", borderRadius: 18, padding: 19, boxShadow: "0 8px 28px rgba(7,26,43,.05)", display: "flex", flexDirection: "column" };
const cardTop: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" };
const articleTag: React.CSSProperties = { color: "#0284c7", fontSize: 12, fontWeight: 900 };
const reading: React.CSSProperties = { color: "#64748b", fontSize: 11, fontWeight: 700 };
const cardTitle: React.CSSProperties = { color: "#0b2f49", fontSize: 21, lineHeight: 1.55, margin: "11px 0 8px" };
const cardText: React.CSSProperties = { color: "#64748b", lineHeight: 1.85, flex: 1 };
const cardActions: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8 };
const readLink: React.CSSProperties = { color: "#075985", textDecoration: "none", fontWeight: 900 };
const featured: React.CSSProperties = { background: "#fff7ed", color: "#9a3412", borderRadius: 999, padding: "5px 8px", fontSize: 10, fontWeight: 900 };
const cta: React.CSSProperties = { marginTop: 34, background: "#0b2f49", color: "white", borderRadius: 22, padding: 23, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap" };
