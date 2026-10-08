import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const services = {
  "bathroom-ventilation": {
    title: "تركيب وتهوية الحمام",
    description:
      "تركيب أو استبدال بلاور الحمام وتجهيز فتحة التهوية وخط الطرد حسب حالة المكان.",
    bullets: [
      "تركيب بلاور جديد أو استبدال القديم.",
      "مراجعة الفتحة ومكان الكهرباء.",
      "رفع صور المكان قبل الزيارة لتوضيح التجهيزات.",
      "توثيق التنفيذ والضمان داخل حساب العميل.",
    ],
  },
  "kitchen-ventilation": {
    title: "تهوية المطبخ",
    description:
      "حلول تهوية للمطبخ تشمل البلاورات وخطوط الطرد حسب مساحة وتجهيزات المكان.",
    bullets: [
      "بلاور مطبخ.",
      "مراجعة مكان الطرد والمنور.",
      "تقدير أولي للتكلفة قبل التنفيذ.",
      "متابعة الطلب والفاتورة والضمان أونلاين.",
    ],
  },
  "hood-exhaust": {
    title: "تركيب هود وخط طرد",
    description:
      "تركيب الهود وخط الطرد وإمكانية إضافة مروحة خارجية حسب احتياج المكان.",
    bullets: [
      "تركيب هود العميل.",
      "تجهيز خط الطرد بالمتر.",
      "إمكانية إضافة مروحة طرد خارجية.",
      "توثيق الصور والخامات أثناء التنفيذ.",
    ],
  },
} as const;

type ServiceSlug =
  keyof typeof services;

export function generateStaticParams() {
  return Object.keys(
    services,
  ).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item =
    services[
      slug as ServiceSlug
    ];

  if (!item) {
    return {};
  }

  return {
    title: item.title,
    description:
      item.description,
    alternates: {
      canonical:
        `/services/${slug}`,
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  const item =
    services[
      slug as ServiceSlug
    ];

  if (!item) notFound();

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
          maxWidth: 860,
          margin: "0 auto",
          background: "white",
          border:
            "1px solid #e2e8f0",
          borderRadius: 22,
          padding: 26,
          boxShadow:
            "0 10px 30px rgba(15,23,42,.06)",
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

        <div
          style={{
            marginTop: 28,
          }}
        >
          <span className="tag">
            حلول التهوية والتركيب
          </span>
          <h1
            style={{
              color: "#0f2d4a",
              fontSize: "clamp(32px,7vw,52px)",
              marginBottom: 8,
            }}
          >
            {item.title}
          </h1>
          <p
            style={{
              color: "#475569",
              lineHeight: 1.9,
              fontSize: 18,
            }}
          >
            {item.description}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            margin: "24px 0",
          }}
        >
          {item.bullets.map(
            (bullet) => (
              <div
                key={bullet}
                style={{
                  border:
                    "1px solid #dbeafe",
                  borderRadius: 12,
                  padding: 12,
                  background:
                    "#f8fbff",
                  color: "#0f2d4a",
                  fontWeight: 800,
                }}
              >
                ✓ {bullet}
              </div>
            ),
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link
            href={`/order?utm_source=Organic&utm_medium=service_page&utm_campaign=${slug}`}
            className="button"
          >
            ابدأ طلب تركيب
          </Link>
          <Link
            href="/faq"
            className="outline"
          >
            الأسئلة الشائعة
          </Link>
        </div>
      </section>
    </main>
  );
}
