import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ governorate: string; area: string }>;
}): Promise<Metadata> {
  const raw = await params;
  const governorate = decode(raw.governorate);
  const area = decode(raw.area);

  return {
    title: `خدمات Ventic Pro في ${area} - ${governorate}`,
    description: `تهوية حمامات ومطابخ وتركيب هود وخطوط طرد في ${area}، ${governorate}. تعرف على أيام الخدمة ورسوم الانتقال وابدأ طلبك أونلاين.`,
    alternates: {
      canonical: `/areas/${encodeURIComponent(governorate)}/${encodeURIComponent(area)}`,
    },
  };
}

export default async function AreaLandingPage({
  params,
}: {
  params: Promise<{ governorate: string; area: string }>;
}) {
  const raw = await params;
  const governorate = decode(raw.governorate);
  const area = decode(raw.area);

  const serviceArea = await prisma.serviceArea.findFirst({
    where: {
      active: true,
      governorate,
      area,
    },
  });

  if (!serviceArea) notFound();

  const fee = Number(serviceArea.travelFee || 0);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `خدمات التهوية والتركيب في ${area}`,
    areaServed: {
      "@type": "AdministrativeArea",
      name: `${area}, ${governorate}`,
    },
    provider: {
      "@type": "HomeAndConstructionBusiness",
      name: "Ventic Pro",
    },
  };

  return (
    <main dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "90px 18px 50px",
        }}
      >
        <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 13 }}>
          {governorate}
        </span>
        <h1
          style={{
            color: "#071a2b",
            fontSize: "clamp(36px,7vw,58px)",
            margin: "7px 0 12px",
          }}
        >
          خدمات Ventic Pro في {area}
        </h1>
        <p style={{ color: "#64748b", lineHeight: 1.9, maxWidth: 760 }}>
          تقدر تطلب تهوية حمام أو مطبخ، تركيب هود أو خط طرد، وتتابع الطلب والفاتورة والضمان من حسابك.
        </p>

        <div style={infoGrid}>
          <Info
            label="رسوم الانتقال"
            value={fee > 0 ? `${fee.toLocaleString("ar-EG")} جنيه` : "بدون رسوم انتقال مسجلة"}
          />
          <Info label="أيام الخدمة" value={serviceArea.serviceDays || "يتم تأكيدها مع الطلب"} />
          <Info label="الحالة" value="متاحة حاليًا" />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
          <Link
            className="button"
            href={`/order?utm_source=Organic&utm_medium=local_seo&utm_campaign=${encodeURIComponent(area)}`}
            data-track="order_intent"
            data-track-label={`area:${area}`}
          >
            اطلب خدمة في {area}
          </Link>
          <Link className="outline" href={`/callback?service=${encodeURIComponent(`خدمة في ${area}`)}`}>
            اسألنا قبل الطلب
          </Link>
          <Link className="outline" href="/works">شوف أعمالنا</Link>
        </div>

        <section style={{ marginTop: 42 }}>
          <h2 style={{ color: "#071a2b" }}>الخدمات المتاحة</h2>
          <div style={serviceGrid}>
            <Service href="/services/bathroom-ventilation" label="تهوية الحمامات" />
            <Service href="/services/kitchen-ventilation" label="تهوية المطابخ" />
            <Service href="/services/hood-exhaust" label="هود وخطوط الطرد" />
            <Service href="/calculator" label="حاسبة السعر التقديري" />
          </div>
        </section>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoStyle}>
      <small style={{ color: "#64748b" }}>{label}</small>
      <strong style={{ display: "block", marginTop: 4, color: "#0b2f49" }}>{value}</strong>
    </div>
  );
}

function Service({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={serviceStyle}>
      <strong>{label}</strong>
      <span>←</span>
    </Link>
  );
}

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 10,
  marginTop: 22,
};
const infoStyle: React.CSSProperties = {
  background: "#f8fbfd",
  border: "1px solid #dbe7ef",
  borderRadius: 14,
  padding: 14,
};
const serviceGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 10,
};
const serviceStyle: React.CSSProperties = {
  minHeight: 72,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 14,
  padding: 15,
  color: "#0b2f49",
  textDecoration: "none",
};
