"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

function qrUrl(target: string) {
  return `https://quickchart.io/qr?size=220&margin=2&text=${encodeURIComponent(target)}`;
}

export default function QrQuickAccess() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const eligible =
    pathname.startsWith("/customer/account/invoices/") ||
    pathname.startsWith("/customer/account/warranty/") ||
    pathname.startsWith("/customer/account/orders/");

  if (!eligible) return null;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const base = String(appUrl).replace(/\/$/, "");
  const targets = [{ label: "هذه الصفحة", url: `${base}${pathname}` }];

  if (pathname.startsWith("/customer/account/warranty/")) {
    const orderId = pathname.split("/").filter(Boolean).pop();
    if (orderId) {
      targets.push({
        label: "تفاصيل الطلب",
        url: `${base}/customer/account/orders/${encodeURIComponent(orderId)}`,
      });
    }
  }

  return (
    <>
      <button
        type="button"
        className="noPrint"
        onClick={() => setOpen(true)}
        aria-label="عرض QR لهذه الصفحة"
        title="QR"
        style={{
          position: "fixed",
          left: 18,
          bottom: 92,
          zIndex: 2920,
          minHeight: 43,
          border: "1px solid #bae6fd",
          borderRadius: 999,
          background: "white",
          color: "#075985",
          padding: "8px 13px",
          fontWeight: 900,
          boxShadow: "0 10px 26px rgba(7,26,43,.14)",
          cursor: "pointer",
        }}
      >
        ▦ QR
      </button>

      {open && (
        <div
          className="noPrint"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 7000,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(7,26,43,.58)",
            backdropFilter: "blur(4px)",
          }}
        >
          <section
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(390px,100%)",
              background: "white",
              border: "1px solid #dbe7ef",
              borderRadius: 20,
              padding: 20,
              textAlign: "center",
              boxShadow: "0 24px 70px rgba(7,26,43,.28)",
            }}
          >
            <h2 style={{ color: "#071a2b", marginTop: 0 }}>
              QR للوصول السريع
            </h2>
            <p style={{ color: "#64748b", lineHeight: 1.75 }}>
              امسح الكود لفتح نفس الصفحة. صفحات الحساب تظل محمية بتسجيل الدخول.
            </p>
            <div style={{ display: "grid", gap: 16 }}>
              {targets.map((item) => (
                <div key={item.url}>
                  <strong style={{ color: "#0b2f49", display: "block", marginBottom: 7 }}>
                    {item.label}
                  </strong>
                  <img
                    src={qrUrl(item.url)}
                    alt={`QR - ${item.label}`}
                    width={220}
                    height={220}
                    loading="lazy"
                    style={{
                      display: "block",
                      width: 220,
                      maxWidth: "100%",
                      height: "auto",
                      margin: "0 auto 7px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                    }}
                  />
                  <small
                    style={{
                      display: "block",
                      direction: "ltr",
                      color: "#94a3b8",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.url}
                  </small>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                minHeight: 44,
                marginTop: 14,
                border: 0,
                borderRadius: 11,
                background: "#0b2f49",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              إغلاق
            </button>
          </section>
        </div>
      )}
    </>
  );
}
