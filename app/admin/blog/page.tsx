import Link from "next/link";
import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import BlogManager from "./BlogManager";

export default async function AdminBlogPage() {
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

  return (
    <main dir="rtl">
      <section
        style={{
          width: "min(1420px,calc(100% - 28px))",
          margin: "0 auto",
          padding: "20px 0 90px",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 12 }}>
            Ventic Pro Content
          </span>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h1 style={{ color: "#071a2b", margin: "5px 0 6px" }}>
              إدارة المقالات
            </h1>
            <Link
              href="/admin/blog/performance"
              style={{
                textDecoration: "none",
                background: "#eef8fd",
                color: "#075985",
                border: "1px solid #bae6fd",
                borderRadius: 10,
                padding: "8px 12px",
                fontWeight: 900,
              }}
            >
              الأداء والتحويلات
            </Link>
            <Link
              href="/admin/cro-experiments"
              style={{
                textDecoration: "none",
                background: "#eef8fd",
                color: "#075985",
                border: "1px solid #bae6fd",
                borderRadius: 10,
                padding: "8px 12px",
                fontWeight: 900,
              }}
            >
              A/B Experiments
            </Link>
          </div>
          <p style={{ color: "#64748b", margin: 0, lineHeight: 1.8 }}>
            إنشاء وتعديل ومعاينة ونشر المقالات وإدارة SEO والمصادر والأسئلة من لوحة التحكم.
          </p>
        </div>

        <BlogManager />
      </section>
    </main>
  );
}
