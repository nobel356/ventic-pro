import Link from "next/link";

export default function NotFound() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "75vh",
        display: "grid",
        placeItems: "center",
        padding: "80px 18px",
        background: "#f4f8fb",
      }}
    >
      <section
        style={{
          width: "min(650px,100%)",
          background: "white",
          border: "1px solid #dbe7ef",
          borderRadius: 22,
          padding: 26,
          textAlign: "center",
          boxShadow: "0 16px 45px rgba(7,26,43,.08)",
        }}
      >
        <div style={{ fontSize: 62, fontWeight: 900, color: "#0a84ff" }}>404</div>
        <h1 style={{ color: "#071a2b" }}>الصفحة دي مش موجودة</h1>
        <p style={{ color: "#64748b", lineHeight: 1.8 }}>
          بدل ما توصل لطريق مسدود، اختار اللي محتاجه من هنا.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <Link className="button" href="/">الرئيسية</Link>
          <Link className="outline" href="/order">اطلب تركيب</Link>
          <Link className="outline" href="/callback">كلّمني</Link>
          <Link className="outline" href="/works">أعمالنا</Link>
        </div>
      </section>
    </main>
  );
}
