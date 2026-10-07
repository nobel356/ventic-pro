import Link from "next/link";
import { ReactNode } from "react";

export default function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f5f8fb",
        padding: "28px 16px 70px",
      }}
    >
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "#075985",
            fontWeight: 900,
          }}
        >
          ← الرئيسية
        </Link>

        <div
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 24,
            marginTop: 16,
            boxShadow: "0 8px 24px rgba(15,23,42,.05)",
          }}
        >
          <h1 style={{ marginTop: 0 }}>{title}</h1>
          <p style={{ color: "#64748b", lineHeight: 1.8 }}>
            {subtitle}
          </p>

          <div
            style={{
              display: "grid",
              gap: 20,
              lineHeight: 1.9,
              color: "#334155",
            }}
          >
            {children}
          </div>

          <div
            style={{
              marginTop: 28,
              paddingTop: 16,
              borderTop: "1px solid #e2e8f0",
              color: "#64748b",
              fontSize: 13,
            }}
          >
            آخر تحديث: 7 أكتوبر 2026. لا تهدف هذه السياسات إلى الانتقاص من أي حقوق إلزامية يقررها القانون للمستهلك.
          </div>
        </div>
      </section>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2
        style={{
          color: "#0f2d4a",
          fontSize: 20,
          marginBottom: 6,
        }}
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
