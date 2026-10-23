"use client";

import { usePathname } from "next/navigation";

const items = [
  "فاتورة موثقة",
  "ضمان ومتابعة",
  "موافقة قبل أي تكلفة إضافية",
  "حساب عميل لكل الطلبات",
];

export default function TrustBar() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/technician") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/customer/account") ||
    pathname.startsWith("/customer/review")
  ) {
    return null;
  }

  return (
    <div
      dir="rtl"
      aria-label="مميزات Ventic Pro"
      style={{
        background: "#071a2b",
        color: "white",
        borderBottom: "1px solid rgba(125,211,252,.18)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "8px 18px",
          display: "flex",
          gap: "8px 18px",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {items.map((item) => (
          <span key={item}>✓ {item}</span>
        ))}
      </div>
    </div>
  );
}
