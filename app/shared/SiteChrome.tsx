"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trackConversion } from "@/lib/client-conversion";

const whatsappNumber =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

const supportPhone =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE ||
  whatsappNumber;

const socials = [
  ["Facebook", process.env.NEXT_PUBLIC_FACEBOOK_URL],
  ["Instagram", process.env.NEXT_PUBLIC_INSTAGRAM_URL],
  ["TikTok", process.env.NEXT_PUBLIC_TIKTOK_URL],
  ["YouTube", process.env.NEXT_PUBLIC_YOUTUBE_URL],
].filter((item): item is [string, string] => Boolean(item[1]));

const mainLinks = [
  {
    href: "/",
    label: "الرئيسية",
    icon: "⌂",
    description: "العودة لبداية الموقع",
  },
  {
    href: "/order",
    label: "اطلب تركيب",
    icon: "＋",
    description: "ابدأ طلب خدمة جديد",
    primary: true,
  },
  {
    href: "/calculator",
    label: "حاسبة السعر",
    icon: "∑",
    description: "تقدير سريع قبل الطلب",
  },
  {
    href: "/callback",
    label: "كلّمني",
    icon: "☎",
    description: "سيب رقمك وإحنا نتواصل معاك",
  },
  {
    href: "/offers",
    label: "العروض",
    icon: "%",
    description: "العروض والكوبونات النشطة",
  },
  {
    href: "/why-ventic",
    label: "ليه Ventic Pro؟",
    icon: "✓",
    description: "اعرف رحلة الخدمة والضمان",
  },
  {
    href: "/works",
    label: "أعمالنا",
    icon: "▶",
    description: "فيديوهات تنفيذ حقيقية",
  },
  {
    href: "/faq",
    label: "الأسئلة الشائعة",
    icon: "?",
    description: "إجابات سريعة قبل الطلب",
  },
  {
    href: "/customer",
    label: "حساب العميل",
    icon: "◉",
    description: "تابع طلباتك وفواتيرك وضمانك",
  },
];

const serviceLinks = [
  {
    href: "/services/bathroom-ventilation",
    label: "تهوية الحمامات",
    icon: "◌",
  },
  {
    href: "/services/kitchen-ventilation",
    label: "تهوية المطابخ",
    icon: "◫",
  },
  {
    href: "/services/hood-exhaust",
    label: "هود وخطوط الطرد",
    icon: "↗",
  },
  {
    href: "/areas",
    label: "مناطق الخدمة",
    icon: "⌖",
  },
  {
    href: "/customer/account/aftercare",
    label: "الصيانة وما بعد التركيب",
    icon: "⚙",
  },
];

const legalLinks = [
  ["/legal/terms", "الشروط والأحكام"],
  ["/legal/privacy", "سياسة الخصوصية"],
  ["/legal/refund", "الاستبدال والاسترجاع"],
  ["/legal/warranty", "سياسة الضمان"],
] as const;

function normalisePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function whatsappDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("01")) {
    return `2${digits}`;
  }

  return digits;
}

function whatsappMessageForPath(pathname: string) {
  if (pathname.startsWith("/services/bathroom-ventilation")) return "مرحبًا Ventic Pro، أنا في صفحة تهوية الحمامات وعاوز أعرف أنسب حل للمكان عندي.";
  if (pathname.startsWith("/services/kitchen-ventilation")) return "مرحبًا Ventic Pro، أنا في صفحة تهوية المطابخ وعاوز استفسر عن الحل المناسب للمطبخ عندي.";
  if (pathname.startsWith("/services/hood-exhaust")) return "مرحبًا Ventic Pro، أنا في صفحة الهود وخطوط الطرد وعاوز استفسر عن التركيب.";
  if (pathname.startsWith("/works")) return "مرحبًا Ventic Pro، شفت أعمالكم وعاوز تنفيذ مشابه عندي.";
  if (pathname.startsWith("/calculator")) return "مرحبًا Ventic Pro، استخدمت حاسبة السعر وعاوز أتأكد من التقدير.";
  if (pathname.startsWith("/offers")) return "مرحبًا Ventic Pro، شفت العروض وعاوز أعرف الأنسب لطلبي.";
  if (pathname.startsWith("/areas")) return "مرحبًا Ventic Pro، عاوز أتأكد إن منطقتي ضمن مناطق الخدمة.";
  if (pathname.startsWith("/order")) return "مرحبًا Ventic Pro، عندي استفسار وأنا بعمل طلب تركيب.";
  return "مرحبًا Ventic Pro، أريد الاستفسار عن خدمات التهوية والتركيب.";
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteChrome() {
  const pathname = usePathname();
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboard =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/technician");

  const isHome = pathname === "/";

  useEffect(() => {
    if (!menuOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function openWhatsapp() {
    const digits = whatsappDigits(whatsappNumber);

    if (!digits) return;

    trackConversion("whatsapp_click", { source: "site_chrome" });

    const message = encodeURIComponent(
      whatsappMessageForPath(pathname),
    );

    window.open(
      `https://wa.me/${digits}?text=${message}`,
      "_blank",
      "noopener,noreferrer",
    );

    setConfirmOpen(false);
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <>
      {!dashboard && (
        <>
          <div
            dir="rtl"
            className="vpGlobalNavDock"
            aria-label="التنقل السريع"
          >
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="vpNavDockButton vpNavDockMenu"
              aria-label="فتح قائمة الموقع"
              title="قائمة الموقع"
            >
              <span aria-hidden="true">☰</span>
              <span>القائمة</span>
            </button>

            {!isHome && (
              <button
                type="button"
                onClick={goBack}
                className="vpNavDockButton"
                aria-label="رجوع"
                title="رجوع"
              >
                <span aria-hidden="true">←</span>
                <span>رجوع</span>
              </button>
            )}
          </div>

          {menuOpen && (
            <div
              className="vpNavOverlay"
              onClick={() => setMenuOpen(false)}
            >
              <aside
                dir="rtl"
                className="vpNavDrawer"
                onClick={(event) => event.stopPropagation()}
                aria-label="قائمة Ventic Pro"
              >
                <div className="vpNavDrawerHead">
                  <Link
                    href="/"
                    className="vpNavDrawerBrand"
                    onClick={() => setMenuOpen(false)}
                  >
                    <img
                      src="/brand/vp-metallic.png"
                      alt=""
                      aria-hidden="true"
                    />
                    <span>
                      <strong>VENTIC PRO</strong>
                      <small>كل خدماتك من مكان واحد</small>
                    </span>
                  </Link>

                  <button
                    type="button"
                    className="vpNavClose"
                    onClick={() => setMenuOpen(false)}
                    aria-label="إغلاق القائمة"
                  >
                    ×
                  </button>
                </div>

                <div className="vpNavDrawerScroll">
                  <nav className="vpNavSection" aria-label="الأقسام الرئيسية">
                    <span className="vpNavSectionTitle">الموقع</span>

                    {mainLinks.map((item) => {
                      const active = isActive(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={[
                            "vpDrawerLink",
                            active ? "active" : "",
                            item.primary ? "primary" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="vpDrawerIcon">{item.icon}</span>
                          <span className="vpDrawerCopy">
                            <strong>{item.label}</strong>
                            <small>{item.description}</small>
                          </span>
                          <span className="vpDrawerArrow">←</span>
                        </Link>
                      );
                    })}
                  </nav>

                  <nav className="vpNavSection" aria-label="الخدمات">
                    <span className="vpNavSectionTitle">الخدمات</span>

                    <div className="vpServiceLinkGrid">
                      {serviceLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={
                            isActive(pathname, item.href)
                              ? "vpServiceDrawerLink active"
                              : "vpServiceDrawerLink"
                          }
                        >
                          <span>{item.icon}</span>
                          <strong>{item.label}</strong>
                        </Link>
                      ))}
                    </div>
                  </nav>

                  <section className="vpNavContactCard">
                    <span className="vpNavSectionTitle">محتاج مساعدة؟</span>

                    <p>
                      تواصل معنا مباشرة بدل ما تخرج من الصفحة أو تدور على وسيلة اتصال.
                    </p>

                    <div className="vpNavContactButtons">
                      {whatsappNumber && (
                        <button
                          type="button"
                          onClick={openWhatsapp}
                          className="vpWhatsAppAction"
                        >
                          واتساب
                        </button>
                      )}

                      {supportPhone && (
                        <a
                          href={`tel:${normalisePhone(supportPhone)}`}
                          className="vpPhoneAction"
                        >
                          اتصال مباشر
                        </a>
                      )}
                    </div>

                    {supportPhone && (
                      <a
                        href={`tel:${normalisePhone(supportPhone)}`}
                        className="vpNavPhoneNumber"
                      >
                        {supportPhone}
                      </a>
                    )}
                  </section>

                  <nav className="vpNavLegal" aria-label="السياسات">
                    {legalLinks.map(([href, label]) => (
                      <Link key={href} href={href}>
                        {label}
                      </Link>
                    ))}
                  </nav>

                  {socials.length > 0 && (
                    <div className="vpNavSocials">
                      {socials.map(([label, url]) => (
                        <a
                          key={label}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}

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
                <div className="vpFooterBrand">
                  <img
                    src="/brand/vp-metallic.png"
                    alt="Ventic Pro"
                  />
                  <div className="vpFooterBrandText">
                    <strong>VENTIC PRO</strong>
                    <small>Air Solutions</small>
                  </div>
                </div>

                <p
                  style={{
                    color: "#c5e2f1",
                    lineHeight: 1.9,
                    maxWidth: 400,
                  }}
                >
                  حلول التهوية والتركيب للحمامات والمطابخ، مع متابعة الطلب والفاتورة والضمان من مكان واحد.
                </p>
              </div>

              <div>
                <strong>روابط سريعة</strong>
                <div
                  style={{
                    display: "grid",
                    gap: 9,
                    marginTop: 12,
                  }}
                >
                  <Link style={footerLink} href="/order">
                    اطلب تركيب
                  </Link>
                  <Link style={footerLink} href="/calculator">
                    حاسبة السعر
                  </Link>
                  <Link style={footerLink} href="/offers">
                    العروض
                  </Link>
                  <Link style={footerLink} href="/areas">
                    مناطق الخدمة
                  </Link>
                  <Link style={footerLink} href="/works">
                    أعمالنا
                  </Link>
                  <Link style={footerLink} href="/faq">
                    الأسئلة الشائعة
                  </Link>
                  <Link style={footerLink} href="/customer">
                    حساب العميل
                  </Link>
                </div>
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
                  {legalLinks.map(([href, label]) => (
                    <Link key={href} style={footerLink} href={href}>
                      {label}
                    </Link>
                  ))}
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
                    socials.map(([label, url]) => (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={socialButton}
                      >
                        {label}
                      </a>
                    ))
                  ) : (
                    <span
                      style={{
                        color: "#b8d9ea",
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
                margin: "28px auto 0",
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

          <nav
            dir="rtl"
            className="vpMobileBottomNav"
            aria-label="روابط سريعة"
          >
            <Link
              href="/"
              className={pathname === "/" ? "active" : ""}
            >
              <span>⌂</span>
              <small>الرئيسية</small>
            </Link>

            <Link
              href="/order"
              className={
                pathname.startsWith("/order") ? "active primary" : "primary"
              }
            >
              <span>＋</span>
              <small>اطلب</small>
            </Link>

            {whatsappNumber ? (
              <button
                type="button"
                onClick={openWhatsapp}
              >
                <span>☎</span>
                <small>واتساب</small>
              </button>
            ) : (
              <Link href="/customer">
                <span>◉</span>
                <small>حسابي</small>
              </Link>
            )}
          </nav>
        </>
      )}

      {!dashboard && whatsappNumber && (
        <button
          type="button"
          aria-label="التواصل عبر واتساب"
          title="التواصل عبر واتساب"
          onClick={() => setConfirmOpen(true)}
          className="vpFloatingWhatsapp"
        >
          ☎
        </button>
      )}

      {confirmOpen && (
        <div
          onClick={() => setConfirmOpen(false)}
          className="vpWhatsappModalBackdrop"
        >
          <div
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
            className="vpWhatsappModal"
          >
            <div className="vpWhatsappModalIcon">☎</div>

            <h2>الانتقال إلى WhatsApp؟</h2>

            <p>
              سيتم فتح واتساب في نافذة جديدة للتواصل مع Ventic Pro. صفحتك الحالية ستظل مفتوحة ولن تفقد ما كنت تعمل عليه.
            </p>

            <div className="vpWhatsappModalActions">
              <button
                type="button"
                onClick={openWhatsapp}
                className="vpWhatsAppAction"
              >
                نعم، فتح WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="vpCancelAction"
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
