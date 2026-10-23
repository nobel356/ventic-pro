"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public-page-error]", error?.digest || error?.message);
  }, [error]);

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
          border: "1px solid #fecaca",
          borderRadius: 22,
          padding: 26,
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#071a2b" }}>حصلت مشكلة مؤقتة</h1>
        <p style={{ color: "#64748b", lineHeight: 1.8 }}>
          تقدر تحاول تاني، أو ترجع للرئيسية وتكمل من هناك.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="button" onClick={reset}>حاول تاني</button>
          <Link className="outline" href="/">الرئيسية</Link>
          <Link className="outline" href="/callback">كلّمني</Link>
        </div>
      </section>
    </main>
  );
}
