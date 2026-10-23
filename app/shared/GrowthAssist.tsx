"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackConversion } from "@/lib/client-conversion";

const whatsappNumber =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
  process.env.NEXT_PUBLIC_SUPPORT_PHONE ||
  "";

function whatsappDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("01") ? `2${digits}` : digits;
}

function messageFor(pathname: string) {
  if (pathname.startsWith("/services/bathroom-ventilation")) {
    return "مرحبًا Ventic Pro، أنا في صفحة تهوية الحمامات وعاوز أعرف أنسب حل للمكان عندي.";
  }
  if (pathname.startsWith("/services/kitchen-ventilation")) {
    return "مرحبًا Ventic Pro، أنا في صفحة تهوية المطابخ وعاوز استفسر عن الحل المناسب للمطبخ عندي.";
  }
  if (pathname.startsWith("/services/hood-exhaust")) {
    return "مرحبًا Ventic Pro، أنا في صفحة الهود وخطوط الطرد وعاوز استفسر عن التركيب.";
  }
  if (pathname.startsWith("/works")) {
    return "مرحبًا Ventic Pro، شفت أعمالكم وعاوز تنفيذ مشابه عندي.";
  }
  if (pathname.startsWith("/calculator")) {
    return "مرحبًا Ventic Pro، استخدمت حاسبة السعر وعاوز أتأكد من التقدير المناسب للمكان عندي.";
  }
  if (pathname.startsWith("/offers")) {
    return "مرحبًا Ventic Pro، شفت العروض على الموقع وعاوز أعرف الأنسب لطلبي.";
  }
  if (pathname.startsWith("/areas")) {
    return "مرحبًا Ventic Pro، عاوز أتأكد إن منطقتي ضمن مناطق الخدمة وتكلفة الانتقال.";
  }
  if (pathname.startsWith("/order")) {
    return "مرحبًا Ventic Pro، عندي استفسار وأنا بعمل طلب تركيب على الموقع.";
  }
  if (pathname.startsWith("/customer")) {
    return "مرحبًا Ventic Pro، محتاج مساعدة بخصوص حساب العميل أو متابعة طلب.";
  }
  return "مرحبًا Ventic Pro، أريد الاستفسار عن خدمات التهوية والتركيب.";
}

export default function GrowthAssist() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/technician")
  ) {
    return null;
  }

  const digits = whatsappDigits(whatsappNumber);

  function openWhatsapp() {
    if (!digits) return;
    trackConversion("whatsapp_click", { source: "mobile_bottom_bar" });

    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(messageFor(pathname))}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <nav dir="rtl" className="vpGrowthMobileNav" aria-label="روابط سريعة">
      <Link href="/" className={pathname === "/" ? "active" : ""}>
        <span>⌂</span>
        <small>الرئيسية</small>
      </Link>

      <Link
        href="/order"
        className={pathname.startsWith("/order") ? "active primary" : "primary"}
        data-track="order_intent"
        data-track-label="mobile_bottom"
      >
        <span>＋</span>
        <small>اطلب</small>
      </Link>

      <Link
        href="/callback"
        className={pathname.startsWith("/callback") ? "active" : ""}
        data-track="callback_intent"
        data-track-label="mobile_bottom"
      >
        <span>☎</span>
        <small>كلّمني</small>
      </Link>

      {digits ? (
        <button type="button" onClick={openWhatsapp}>
          <span>◉</span>
          <small>واتساب</small>
        </button>
      ) : (
        <Link href="/areas">
          <span>⌖</span>
          <small>المناطق</small>
        </Link>
      )}

      <style>{`
        .vpGrowthMobileNav{display:none}
        @media(max-width:760px){
          .vpGrowthMobileNav{
            position:fixed;
            right:max(10px,env(safe-area-inset-right));
            left:max(10px,env(safe-area-inset-left));
            bottom:max(8px,env(safe-area-inset-bottom));
            z-index:2950;
            height:62px;
            padding:6px;
            display:grid;
            grid-template-columns:repeat(4,1fr);
            gap:5px;
            border:1px solid rgba(15,47,73,.13);
            border-radius:18px;
            background:rgba(255,255,255,.96);
            box-shadow:0 14px 36px rgba(7,26,43,.18);
            backdrop-filter:blur(14px);
          }
          .vpGrowthMobileNav a,
          .vpGrowthMobileNav button{
            border:0;
            border-radius:13px;
            background:transparent;
            color:#475569;
            text-decoration:none;
            display:grid;
            place-items:center;
            align-content:center;
            gap:2px;
            font:inherit;
            cursor:pointer;
          }
          .vpGrowthMobileNav span{font-size:19px;line-height:1}
          .vpGrowthMobileNav small{font-size:10px;font-weight:900}
          .vpGrowthMobileNav .active{background:#eef8fd;color:#075985}
          .vpGrowthMobileNav .primary{
            background:linear-gradient(135deg,#0a84ff,#0574d4);
            color:white;
          }
        }
      `}</style>
    </nav>
  );
}
