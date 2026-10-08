import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description:
    "أسئلة شائعة عن طلب وتركيب خدمات Ventic Pro والأسعار والمواعيد والضمان.",
};

const questions = [
  [
    "هل السعر في الطلب نهائي؟",
    "السعر أثناء إنشاء الطلب تقديري. تتم مراجعة الصور والتجهيزات ثم يتم تأكيد مقايسة Ventic Pro قبل التنفيذ.",
  ],
  [
    "هل أقدر أرفع صور المكان؟",
    "نعم، ويمكن رفع صور لكل حمام أو مطبخ أثناء إنشاء الطلب لتسهيل المراجعة قبل الزيارة.",
  ],
  [
    "إزاي أتابع الطلب؟",
    "من حساب العميل تقدر تتابع حالة الطلب والفاتورة والضمان وطلبات ما بعد التركيب.",
  ],
  [
    "إزاي يتم تأكيد انتهاء التركيب؟",
    "يتم إصدار كود OTP للعميل، ولا يتم اعتماد إتمام التركيب إلا بعد إدخال الكود الصحيح.",
  ],
  [
    "هل فيه ضمان؟",
    "مدة الضمان المسجلة للطلب تظهر داخل حساب العميل والفاتورة وسجل ما بعد التركيب.",
  ],
  [
    "هل بياناتي وصوري بتظهر للعامة؟",
    "لا. الصور وبيانات الطلب محفوظة داخل النظام، والتقييم العام لا يظهر إلا بموافقة العميل وبدون رقم الموبايل أو العنوان.",
  ],
];

export default function FaqPage() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f5f8fb",
        padding: "28px 16px 70px",
      }}
    >
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          className="brand"
          style={{
            textDecoration: "none",
          }}
        >
          <i>V</i> Ventic Pro
        </Link>

        <h1
          style={{
            color: "#0f2d4a",
            marginTop: 28,
          }}
        >
          الأسئلة الشائعة
        </h1>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {questions.map(
            ([question, answer]) => (
              <details
                key={question}
                style={{
                  background: "white",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 15,
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    color: "#0f2d4a",
                    fontWeight: 900,
                  }}
                >
                  {question}
                </summary>
                <p
                  style={{
                    color: "#64748b",
                    lineHeight: 1.8,
                    marginBottom: 0,
                  }}
                >
                  {answer}
                </p>
              </details>
            ),
          )}
        </div>

        <div
          style={{
            marginTop: 22,
          }}
        >
          <Link
            href="/order?utm_source=Organic&utm_medium=faq&utm_campaign=faq_cta"
            className="button"
          >
            ابدأ طلبك الآن
          </Link>
        </div>
      </section>
    </main>
  );
}
