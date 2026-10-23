import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ليه Ventic Pro؟",
  description:
    "اعرف رحلة الخدمة في Ventic Pro من الطلب والمقايسة إلى التنفيذ والفاتورة والضمان والمتابعة.",
  alternates: { canonical: "/why-ventic" },
};

const reasons = [
  ["سعر واضح قبل التنفيذ", "التقدير الأولي يظهر في الطلب، وأي مقايسة أو تكلفة إضافية يتم توضيحها قبل التنفيذ."],
  ["توثيق كامل", "الطلب والفاتورة والمدفوعات والضمان يظلوا مرتبطين بحساب العميل."],
  ["موافقة العميل", "أي تكلفة إضافية لها سبب ومبلغ واضح قبل اعتمادها."],
  ["متابعة التنفيذ", "حالة الطلب تتحدث من الاستلام وحتى الإتمام."],
  ["ضمان وما بعد التركيب", "بعد الإتمام يقدر العميل يرجع لشهادة الضمان ويطلب صيانة أو يسجل شكوى."],
  ["أعمال حقيقية", "قسم أعمالنا يعرض فيديوهات YouTube وTikTok بعد موافقة أصحابها على العرض."],
];

const steps = [
  "اختار الخدمة وارفع صور المكان",
  "راجع السعر التقديري أو اطلب مكالمة",
  "نراجع التفاصيل والمقايسة",
  "يتم تحديد الفني والموعد",
  "التنفيذ والتوثيق",
  "فاتورة + ضمان + تقييم + متابعة",
];

export default function WhyVenticPage() {
  return (
    <main dir="rtl">
      <section style={heroStyle}>
        <span style={{ color: "#38bdf8", fontWeight: 900 }}>Ventic Pro</span>
        <h1>مش مجرد تركيب وخلاص</h1>
        <p>
          الهدف إن العميل يعرف هو فين، دفع كام، اتنفذ إيه، وضمانه لحد إمتى — من مكان واحد.
        </p>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <Link className="button" href="/order" data-track="order_intent" data-track-label="why_ventic">
            ابدأ طلب
          </Link>
          <Link className="outline" href="/works" style={{ background: "white" }}>
            شوف أعمالنا
          </Link>
          <Link className="outline" href="/calculator" style={{ background: "white" }}>
            احسب سعر مبدئي
          </Link>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>ليه Ventic Pro مختلف؟</h2>
        <div style={gridStyle}>
          {reasons.map(([title, text]) => (
            <article key={title} style={cardStyle}>
              <span style={iconStyle}>✓</span>
              <div>
                <strong style={{ color: "#071a2b" }}>{title}</strong>
                <p style={{ color: "#64748b", lineHeight: 1.8, marginBottom: 0 }}>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>رحلة الخدمة</h2>
        <div style={gridStyle}>
          {steps.map((step, index) => (
            <article key={step} style={stepStyle}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>{step}</span>
            </article>
          ))}
        </div>
      </section>

      <section style={{ ...sectionStyle, paddingBottom: 40 }}>
        <div style={ctaStyle}>
          <div>
            <h2 style={{ margin: 0 }}>جاهز تبدأ؟</h2>
            <p style={{ color: "#c8e2f0", marginBottom: 0 }}>ابدأ طلب كامل أو سيب رقمك وإحنا نكلمك.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="button" href="/order">طلب جديد</Link>
            <Link className="outline" href="/callback" style={{ background: "white" }}>كلّمني</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const heroStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "100px 18px 50px",
  background: "linear-gradient(145deg,#103e5f,#071a2b)",
  color: "white",
  borderRadius: "0 0 30px 30px",
};
const sectionStyle: React.CSSProperties = { maxWidth: 1180, margin: "45px auto 0", padding: "0 18px" };
const headingStyle: React.CSSProperties = { color: "#071a2b", fontSize: "clamp(27px,4vw,36px)" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 };
const cardStyle: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 17, display: "flex", gap: 11, alignItems: "flex-start" };
const iconStyle: React.CSSProperties = { width: 34, height: 34, flex: "0 0 34px", display: "grid", placeItems: "center", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 900 };
const stepStyle: React.CSSProperties = { ...cardStyle, alignItems: "center" };
const ctaStyle: React.CSSProperties = { background: "#0b2f49", color: "white", borderRadius: 20, padding: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
