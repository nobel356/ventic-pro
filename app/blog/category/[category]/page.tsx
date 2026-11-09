export const revalidate = 60;
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  blogCategories,
  getBlogCategory,
} from "@/lib/blog/categories";
import { getPublishedBlogArticles } from "@/lib/blog/cms";

export function generateStaticParams() {
  return blogCategories.map((category) => ({
    category: category.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const result = await params;
  const category = getBlogCategory(result.category);

  if (!category) return {};

  return {
    title: category.title,
    description: category.description,
    alternates: {
      canonical: "/blog/category/" + category.slug,
    },
    openGraph: {
      title: category.title,
      description: category.description,
      type: "website",
      url: "/blog/category/" + category.slug,
    },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const result = await params;
  const category = getBlogCategory(result.category);

  if (!category) notFound();

  const articles = (await getPublishedBlogArticles()).filter(
    (article) => article.category === category.name,
  );

  if (!articles.length) notFound();

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ventic-pro.com"
  ).replace(/\/$/, "");

  const pageUrl =
    baseUrl + "/blog/category/" + category.slug;

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": pageUrl + "#collection",
    url: pageUrl,
    name: category.title,
    description: category.description,
    inLanguage: "ar-EG",
    isPartOf: {
      "@id": baseUrl + "/#website",
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map(
        (article, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: baseUrl + "/blog/" + article.slug,
          name: article.title,
        }),
      ),
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
        item: baseUrl + "/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: pageUrl,
      },
    ],
  };

  return (
    <main
      dir="rtl"
      style={{
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "85px 18px 55px",
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
            marginBottom: 14,
          }}
        >
          <Link href="/" style={crumbLink}>
            الرئيسية
          </Link>
          <span>‹</span>
          <Link href="/blog" style={crumbLink}>
            دليل التهوية
          </Link>
          <span>‹</span>
          <span>{category.name}</span>
        </nav>

        <header style={hero}>
          <span style={eyebrow}>Topic Hub</span>
          <h1 style={h1}>{category.title}</h1>
          <p style={lead}>{category.intro}</p>

          <div style={heroActions}>
            <Link
              className="button"
              href={category.serviceHref}
            >
              {category.serviceLabel}
            </Link>
            <Link
              className="outline"
              href="/blog"
            >
              كل المقالات
            </Link>
          </div>
        </header>

        <section style={{ marginTop: 30 }}>
          <div style={sectionHead}>
            <div>
              <span style={eyebrow}>
                {articles.length} مقالات
              </span>
              <h2 style={h2}>
                ابدأ بالموضوع الأقرب لمشكلتك
              </h2>
            </div>
          </div>

          <div style={grid}>
            {articles.map(
              (article, index) => (
                <article
                  key={article.slug}
                  style={card}
                >
                  <div style={cardMeta}>
                    <span>{index + 1}</span>
                    <span>
                      {article.readingMinutes} دقائق
                    </span>
                  </div>

                  <h3 style={cardTitle}>
                    {article.title}
                  </h3>

                  <p style={cardText}>
                    {article.excerpt}
                  </p>

                  <Link
                    href={
                      "/blog/" + article.slug
                    }
                    style={readLink}
                  >
                    اقرأ المقال ←
                  </Link>
                </article>
              ),
            )}
          </div>
        </section>

        <section style={bottomCta}>
          <div>
            <strong style={{ fontSize: 22 }}>
              المعلومة لوحدها مش مقايسة
            </strong>
            <p
              style={{
                color: "#c8e2f0",
                lineHeight: 1.8,
                marginBottom: 0,
              }}
            >
              استخدم المقال لفهم الاختيارات، وبعدها راجع صور المكان والمسار الفعلي قبل التنفيذ.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Link
              className="button"
              href={category.serviceHref}
            >
              {category.serviceLabel}
            </Link>
            <Link
              className="outline"
              href="/order"
              style={{ background: "white" }}
            >
              ابدأ طلب
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

const crumbLink: React.CSSProperties = {
  color: "#075985",
  textDecoration: "none",
  fontWeight: 800,
};
const hero: React.CSSProperties = {
  background:
    "linear-gradient(145deg,#f8fcff,#eef8fd)",
  border: "1px solid #d7e9f3",
  borderRadius: 24,
  padding: "clamp(24px,5vw,45px)",
};
const eyebrow: React.CSSProperties = {
  color: "#0284c7",
  fontWeight: 900,
  fontSize: 12,
};
const h1: React.CSSProperties = {
  color: "#071a2b",
  fontSize: "clamp(38px,7vw,62px)",
  lineHeight: 1.15,
  margin: "8px 0 13px",
};
const lead: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.95,
  fontSize: 17,
  maxWidth: 850,
};
const heroActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 18,
};
const sectionHead: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "end",
  marginBottom: 14,
};
const h2: React.CSSProperties = {
  color: "#0b2f49",
  fontSize: "clamp(27px,4vw,34px)",
  margin: "5px 0 0",
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(270px,1fr))",
  gap: 12,
};
const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 17,
  padding: 18,
  display: "flex",
  flexDirection: "column",
};
const cardMeta: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 800,
};
const cardTitle: React.CSSProperties = {
  color: "#0b2f49",
  fontSize: 20,
  lineHeight: 1.55,
  margin: "10px 0 8px",
};
const cardText: React.CSSProperties = {
  color: "#64748b",
  lineHeight: 1.85,
  flex: 1,
};
const readLink: React.CSSProperties = {
  color: "#075985",
  textDecoration: "none",
  fontWeight: 900,
};
const bottomCta: React.CSSProperties = {
  marginTop: 35,
  background: "#0b2f49",
  color: "white",
  borderRadius: 22,
  padding: 23,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  flexWrap: "wrap",
};
