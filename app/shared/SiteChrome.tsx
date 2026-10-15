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

    const egyptNumber =
      digits.startsWith("01")
        ? `2${digits}`
        : digits;

    const message = encodeURIComponent(
      "مرحبًا Ventic Pro، أريد الاستفسار عن خدمات التهوية والتركيب.",
    );

    window.open(
      `https://wa.me/${egyptNumber}?text=${message}`,
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
            background:
              "linear-gradient(155deg,#103e5f 0%,#071a2b 78%)",
            color: "white",
            padding: "40px 18px 30px",
            borderTop:
              "1px solid rgba(56,189,248,.18)",
          }}
        >
          <div
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: 28,
            }}
          >
            <div>
              <strong
                style={{
                  fontSize: 22,
                  letterSpacing:
                    "-.02em",
                }}
              >
                Ventic Pro
              </strong>
              <p
                style={{
                  color:
                    "#c5e2f1",
                  lineHeight: 1.9,
                  maxWidth: 400,
                }}
              >
                حلول التهوية والتركيب للحمامات والمطابخ، مع متابعة الطلب والفاتورة والضمان من مكان واحد.
              </p>
            </div>

            <div>
              <strong>السياسات</strong>
              <div
                style={{
                  display: "grid",
                  gap: 9,
                  marginTop: 12,
                }}
              >
                <Link
                  style={footerLink}
                  href="/legal/terms"
                >
                  الشروط والأحكام
                </Link>
                <Link
                  style={footerLink}
                  href="/legal/privacy"
                >
                  سياسة الخصوصية
                </Link>
                <Link
                  style={footerLink}
                  href="/legal/refund"
                >
                  الاستبدال والاسترجاع
                </Link>
                <Link
                  style={footerLink}
                  href="/legal/warranty"
                >
                  سياسة الضمان
                </Link>
              </div>
            </div>

            <div>
              <strong>تابعنا</strong>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {socials.length ? (
                  socials.map(
                    ([label, url]) => (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={
                          socialButton
                        }
                      >
                        {label}
                      </a>
                    ),
                  )
                ) : (
                  <span
                    style={{
                      color:
                        "#b8d9ea",
                      fontSize: 13,
                    }}
                  >
                    روابط السوشيال تظهر تلقائيًا بعد إضافتها في إعدادات الموقع.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              maxWidth: 1180,
              margin:
                "28px auto 0",
              borderTop:
                "1px solid rgba(255,255,255,.12)",
              paddingTop: 16,
              color: "#aacddd",
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
          onClick={() =>
            setConfirmOpen(true)
          }
          style={{
            position: "fixed",
            left: 18,
            bottom: 18,
            zIndex: 3000,
            width: 58,
            height: 58,
            borderRadius: "50%",
            border:
              "1px solid rgba(255,255,255,.72)",
            background:
              "linear-gradient(145deg,#22c55e,#16a34a)",
            color: "white",
            fontSize: 26,
            boxShadow:
              "0 14px 34px rgba(7,26,43,.24)",
            cursor: "pointer",
          }}
        >
          ☎
        </button>
      )}

      {confirmOpen && (
        <div
          onClick={() =>
            setConfirmOpen(false)
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4000,
            background:
              "rgba(7,26,43,.58)",
            display: "grid",
            placeItems: "center",
            padding: 18,
            backdropFilter:
              "blur(3px)",
          }}
        >
          <div
            dir="rtl"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width:
                "min(430px,100%)",
              background:
                "white",
              border:
                "1px solid #dce8ef",
              borderRadius: 20,
              padding: 22,
              boxShadow:
                "0 26px 70px rgba(7,26,43,.30)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: "grid",
                placeItems:
                  "center",
                background:
                  "#ecfdf5",
                color:
                  "#16a34a",
                fontSize: 24,
                marginBottom: 12,
              }}
            >
              ☎
            </div>

            <h2
              style={{
                marginTop: 0,
                color:
                  "#0b2f49",
              }}
            >
              الانتقال إلى WhatsApp؟
            </h2>

            <p
              style={{
                color:
                  "#64748b",
                lineHeight: 1.8,
              }}
            >
              سيتم فتح واتساب في نافذة جديدة للتواصل مع Ventic Pro. صفحتك الحالية ستظل مفتوحة ولن تفقد ما كنت تعمل عليه.
            </p>

            <div
              style={{
                display: "flex",
                gap: 9,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={openWhatsapp}
                style={{
                  border: 0,
                  borderRadius: 10,
                  background:
                    "linear-gradient(135deg,#22c55e,#16a34a)",
                  color: "white",
                  padding:
                    "11px 16px",
                  fontWeight: 900,
                  cursor:
                    "pointer",
                }}
              >
                نعم، فتح WhatsApp
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfirmOpen(
                    false,
                  )
                }
                style={{
                  border:
                    "1px solid #cbd5e1",
                  borderRadius: 10,
                  background:
                    "white",
                  color:
                    "#0b2f49",
                  padding:
                    "11px 16px",
                  fontWeight: 900,
                  cursor:
                    "pointer",
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
  color: "#d9edf8",
  textDecoration: "none",
};

const socialButton: React.CSSProperties = {
  color: "white",
  textDecoration: "none",
  border:
    "1px solid rgba(125,211,252,.30)",
  background:
    "rgba(56,189,248,.08)",
  borderRadius: 999,
  padding: "8px 11px",
  fontSize: 12,
};
