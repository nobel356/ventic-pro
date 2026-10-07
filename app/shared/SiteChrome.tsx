"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const whatsappNumber =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

const socials = [
  ["Facebook", process.env.NEXT_PUBLIC_FACEBOOK_URL],
  ["Instagram", process.env.NEXT_PUBLIC_INSTAGRAM_URL],
  ["TikTok", process.env.NEXT_PUBLIC_TIKTOK_URL],
  ["YouTube", process.env.NEXT_PUBLIC_YOUTUBE_URL],
].filter((item): item is [string, string] => Boolean(item[1]));

export default function SiteChrome() {
  const pathname = usePathname();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dashboard =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/technician");

  function openWhatsapp() {
    const digits = whatsappNumber.replace(/\D/g, "");

    if (!digits) return;

    const message = encodeURIComponent(
      "مرحبًا Ventic Pro، أريد الاستفسار عن خدمات التهوية والتركيب.",
    );

    window.open(
      `https://wa.me/${digits}?text=${message}`,
      "_blank",
      "noopener,noreferrer",
    );
    setConfirmOpen(false);
  }

  return (
    <>
      {!dashboard && (
        <footer
          dir="rtl"
          style={{
            marginTop: 50,
            background: "#0b2f49",
            color: "white",
            padding: "34px 18px",
          }}
        >
          <div
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 24,
            }}
          >
            <div>
              <strong style={{ fontSize: 20 }}>Ventic Pro</strong>
              <p style={{ color: "#bfdbfe", lineHeight: 1.8 }}>
                حلول التهوية والتركيب للحمامات والمطابخ، مع متابعة الطلب والفاتورة والضمان من مكان واحد.
              </p>
            </div>

            <div>
              <strong>السياسات</strong>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <Link style={footerLink} href="/legal/terms">الشروط والأحكام</Link>
                <Link style={footerLink} href="/legal/privacy">سياسة الخصوصية</Link>
                <Link style={footerLink} href="/legal/refund">الاستبدال والاسترجاع</Link>
                <Link style={footerLink} href="/legal/warranty">سياسة الضمان</Link>
              </div>
            </div>

            <div>
              <strong>تابعنا</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {socials.length ? (
                  socials.map(([label, url]) => (
                    <a key={label} href={url} target="_blank" rel="noreferrer" style={socialButton}>
                      {label}
                    </a>
                  ))
                ) : (
                  <span style={{ color: "#bfdbfe", fontSize: 13 }}>
                    روابط السوشيال تظهر تلقائيًا بعد إضافتها في إعدادات الموقع.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              maxWidth: 1180,
              margin: "24px auto 0",
              borderTop: "1px solid rgba(255,255,255,.12)",
              paddingTop: 14,
              color: "#bfdbfe",
              fontSize: 12,
            }}
          >
            © {new Date().getFullYear()} Ventic Pro — جميع الحقوق محفوظة.
          </div>
        </footer>
      )}

      {whatsappNumber && (
        <button
          type="button"
          aria-label="التواصل عبر واتساب"
          title="التواصل عبر واتساب"
          onClick={() => setConfirmOpen(true)}
          style={{
            position: "fixed",
            left: 18,
            bottom: 18,
            zIndex: 3000,
            width: 58,
            height: 58,
            borderRadius: "50%",
            border: 0,
            background: "#16a34a",
            color: "white",
            fontSize: 26,
            boxShadow: "0 12px 30px rgba(15,23,42,.24)",
            cursor: "pointer",
          }}
        >
          ☎
        </button>
      )}

      {confirmOpen && (
        <div
          onClick={() => setConfirmOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4000,
            background: "rgba(15,23,42,.48)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(430px,100%)",
              background: "white",
              borderRadius: 18,
              padding: 22,
              boxShadow: "0 24px 60px rgba(15,23,42,.3)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>الانتقال إلى WhatsApp؟</h2>
            <p style={{ color: "#64748b", lineHeight: 1.8 }}>
              سيتم فتح واتساب في نافذة جديدة للتواصل مع Ventic Pro. صفحتك الحالية ستظل مفتوحة ولن تفقد ما كنت تعمل عليه.
            </p>

            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={openWhatsapp}
                style={{
                  border: 0,
                  borderRadius: 10,
                  background: "#16a34a",
                  color: "white",
                  padding: "11px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                نعم، فتح WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  background: "white",
                  color: "#0f2d4a",
                  padding: "11px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const footerLink: React.CSSProperties = {
  color: "#dbeafe",
  textDecoration: "none",
};
const socialButton: React.CSSProperties = {
  color: "white",
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,.22)",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
};
