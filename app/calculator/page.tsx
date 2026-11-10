import type { Metadata } from "next";
import CalculatorClient from "./CalculatorClient";

export const metadata: Metadata = {
  title: "حاسبة السعر التقديري",
  description:
    "احسب سعرًا تقديريًا لخدمات Ventic Pro من الأسعار الحالية قبل بدء طلب التركيب.",
  alternates: { canonical: "/calculator" },
};

export default function CalculatorPage() {
  return (
    <>
      <CalculatorClient />

      <section
        dir="rtl"
        style={{
          maxWidth: 1040,
          margin: "26px auto 60px",
          padding: "0 18px",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #dbe7ef",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <h2 style={{ color: "#0b2f49", marginTop: 0 }}>
            الحاسبة بتديك تقدير مبدئي، مش مقايسة نهائية
          </h2>

          <p style={{ color: "#475569", lineHeight: 1.9 }}>
            تكلفة تركيب التهوية لا تعتمد على سعر الجهاز وحده. طول خط الطرد، عدد الأكواع، قطر الدكت،
            وجود فتحة جاهزة، صعوبة الوصول ومكان التركيب كلها ممكن تغيّر التكلفة الحقيقية. الحاسبة هدفها
            تساعدك تفهم نطاق السعر قبل ما تبدأ الطلب، وبعدها نراجع صور المكان والتفاصيل الفنية قبل تثبيت
            أي مبلغ نهائي.
          </p>

          <h3 style={{ color: "#0b2f49" }}>إيه اللي يخلي التقدير يتغير؟</h3>
          <ul style={{ color: "#475569", lineHeight: 1.9 }}>
            <li>الحاجة لفتح كور أو تعديل فتحة موجودة.</li>
            <li>زيادة طول الدكت أو استخدام محولات وأكواع إضافية.</li>
            <li>تركيب مروحة خارجية أو inline بدل شفاط مباشر.</li>
            <li>اختلاف مقاس الهود أو مكان فتحة الخروج عن البيانات المبدئية.</li>
            <li>رسوم انتقال مرتبطة بمنطقة خدمة فعلية عند تفعيلها بالنظام.</li>
          </ul>

          <p style={{ color: "#64748b", lineHeight: 1.9, marginBottom: 0 }}>
            لو عندك صور للمطبخ أو الحمام، ارفعها أثناء إنشاء الطلب. الصور أهم من محاولة تخمين كل التفاصيل
            بنفسك، لأنها تساعد فريق Ventic Pro يراجع الفتحة والمسار والتجهيزات قبل الزيارة.
          </p>
        </div>
      </section>
    </>
  );
}
