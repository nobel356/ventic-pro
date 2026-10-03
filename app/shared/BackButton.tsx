"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  fallbackHref,
}: {
  fallbackHref: string;
}) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="الرجوع للصفحة السابقة"
      title="رجوع"
      style={{
        position: "fixed",
        left: 18,
        bottom: 18,
        zIndex: 2400,
        minWidth: 50,
        height: 46,
        border: "1px solid #d7e0e8",
        borderRadius: 14,
        background: "#ffffff",
        color: "#0f2d4a",
        boxShadow: "0 10px 28px rgba(15,23,42,.16)",
        padding: "0 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        cursor: "pointer",
        fontWeight: 900,
        fontFamily: "inherit",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 20 }}>
        ←
      </span>
      <span>رجوع</span>
    </button>
  );
}
