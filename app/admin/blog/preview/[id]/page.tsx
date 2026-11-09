import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import { prisma } from "@/lib/prisma";

export default async function BlogPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.BLOG_MANAGE,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  const { id } = await params;

  const article = await prisma.blogArticle.findUnique({
    where: { id },
  });

  if (!article) notFound();

  const sections = Array.isArray(article.sections)
    ? (article.sections as any[])
    : [];
  const faq = Array.isArray(article.faq)
    ? (article.faq as any[])
    : [];
  const sources = Array.isArray(article.sources)
    ? (article.sources as any[])
    : [];

  return (
    <main dir="rtl" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <article
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "35px 18px 70px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <span
              style={{
                color: "#0284c7",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              Admin Preview
            </span>
            <h1 style={{ margin: "4px 0 0", color: "#071a2b" }}>
              معاينة المقال
            </h1>
          </div>

          <Link
            href="/admin/blog"
            style={{
              textDecoration: "none",
              color: "#075985",
              fontWeight: 900,
            }}
          >
            ← رجوع للإدارة
          </Link>
        </div>

        <header
          style={{
            background:
              "linear-gradient(145deg,#f8fcff,#eef8fd)",
            border: "1px solid #d7e9f3",
            borderRadius: 24,
            padding: "clamp(22px,5vw,42px)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              color: "#64748b",
              fontSize: 12,
            }}
          >
            <span>{article.category}</span>
            <span>•</span>
            <span>{article.readingMinutes} دقائق قراءة</span>
            <span>•</span>
            <strong
              style={{
                color:
                  article.status === "PUBLISHED"
                    ? "#166534"
                    : "#9a3412",
              }}
            >
              {article.status === "PUBLISHED"
                ? "منشور"
                : "مسودة"}
            </strong>
          </div>

          <h2
            style={{
              color: "#071a2b",
              fontSize: "clamp(34px,6vw,54px)",
              lineHeight: 1.25,
              margin: "12px 0",
            }}
          >
            {article.title}
          </h2>

          <p
            style={{
              color: "#475569",
              lineHeight: 1.95,
              fontSize: 17,
            }}
          >
            {article.description}
          </p>
        </header>

        {article.visualPath && (
          <img
            src={article.visualPath}
            alt={`معاينة صورة ${article.title}`}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: 18,
              border: "1px solid #dbe7ef",
              marginTop: 20,
            }}
          />
        )}

        <div style={{ marginTop: 28 }}>
          {sections.map((section, index) => (
            <section key={index} style={{ marginTop: 28 }}>
              <h2 style={{ color: "#0b2f49" }}>
                {section?.heading || `قسم ${index + 1}`}
              </h2>

              {(Array.isArray(section?.paragraphs)
                ? section.paragraphs
                : []
              ).map((paragraph: string, i: number) => (
                <p
                  key={i}
                  style={{
                    color: "#334155",
                    lineHeight: 2,
                    fontSize: 16,
                  }}
                >
                  {paragraph}
                </p>
              ))}

              {Array.isArray(section?.bullets) &&
                section.bullets.length > 0 && (
                  <ul
                    style={{
                      color: "#334155",
                      lineHeight: 1.9,
                    }}
                  >
                    {section.bullets.map(
                      (item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ),
                    )}
                  </ul>
                )}

              {section?.note && (
                <div
                  style={{
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#9a3412",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  {section.note}
                </div>
              )}
            </section>
          ))}
        </div>

        {faq.length > 0 && (
          <section style={{ marginTop: 36 }}>
            <h2 style={{ color: "#0b2f49" }}>الأسئلة الشائعة</h2>
            <div style={{ display: "grid", gap: 9 }}>
              {faq.map((item, index) => (
                <details
                  key={index}
                  style={{
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 13,
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      fontWeight: 900,
                      color: "#0b2f49",
                    }}
                  >
                    {item?.[0]}
                  </summary>
                  <p
                    style={{
                      color: "#64748b",
                      lineHeight: 1.8,
                    }}
                  >
                    {item?.[1]}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {sources.length > 0 && (
          <section
            style={{
              marginTop: 30,
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: 15,
              padding: 15,
            }}
          >
            <h2 style={{ color: "#0b2f49", marginTop: 0 }}>
              المراجع
            </h2>
            {sources.map((item, index) => (
              <a
                key={index}
                href={item?.[1]}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block",
                  color: "#075985",
                  fontWeight: 800,
                  marginTop: 6,
                }}
              >
                {item?.[0]} ↗
              </a>
            ))}
          </section>
        )}
      </article>
    </main>
  );
}
