import Link from "next/link";

export default function OfflinePage() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f5f8fb",
        padding: 20,
      }}
    >
      <section
        style={{
          maxWidth: 560,
          background: "white",
          border:
            "1px solid #e2e8f0",
          borderRadius: 20,
          padding: 26,
          textAlign: "center",
          boxShadow:
            "0 12px 30px rgba(15,23,42,.08)",
        }}
      >
        <h1
          style={{
            color: "#0f2d4a",
          }}
        >
          الاتصال بالإنترنت غير متاح
        </h1>
        <p
          style={{
            color: "#64748b",
            lineHeight: 1.8,
          }}
        >
          بعض الصفحات المحفوظة ممكن تفضل متاحة. رجّع الاتصال وحاول مرة تانية لإرسال أو تحديث أي بيانات.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            textDecoration: "none",
            background: "#f97316",
            color: "white",
            padding: "10px 16px",
            borderRadius: 10,
            fontWeight: 900,
          }}
        >
          العودة للرئيسية
        </Link>
      </section>
    </main>
  );
}
