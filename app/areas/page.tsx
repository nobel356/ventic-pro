import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مناطق الخدمة",
  description:
    "تعرف على مناطق خدمة Ventic Pro وأيام الخدمة ورسوم الانتقال المسجلة لكل منطقة.",
  alternates: { canonical: "/areas" },
};

export default async function AreasPage() {
  const areas = await prisma.serviceArea.findMany({
    where: { active: true },
    orderBy: [
      { governorate: "asc" },
      { area: "asc" },
    ],
  });

  const grouped = new Map<string, typeof areas>();

  for (const item of areas) {
    const list = grouped.get(item.governorate) || [];
    list.push(item);
    grouped.set(item.governorate, list);
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "70vh",
        padding: "85px 18px 45px",
        background: "#f4f8fb",
      }}
    >
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 13 }}>
          تغطية Ventic Pro
        </span>

        <h1
          style={{
            color: "#071a2b",
            fontSize: "clamp(34px,6vw,52px)",
            margin: "7px 0 10px",
          }}
        >
          مناطق الخدمة
        </h1>

        <p style={{ color: "#64748b", lineHeight: 1.85, maxWidth: 760 }}>
          اختار منطقتك لفتح صفحة مخصصة فيها رسوم الانتقال وأيام الخدمة وروابط الطلب المباشر.
        </p>

        {areas.length === 0 ? (
          <div style={emptyStyle}>
            لم يتم نشر مناطق خدمة محددة بعد. تقدر تعمل طلب أو تطلب مكالمة، وفريق Ventic Pro يؤكد لك التغطية.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
            {[...grouped.entries()].map(([governorate, items]) => (
              <section key={governorate}>
                <h2 style={{ color: "#0b2f49", marginBottom: 10 }}>{governorate}</h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                    gap: 10,
                  }}
                >
                  {items.map((item) => {
                    const fee = Number(item.travelFee || 0);
                    const href = `/areas/${encodeURIComponent(item.governorate)}/${encodeURIComponent(item.area)}`;

                    return (
                      <Link key={item.id} href={href} style={cardStyle}>
                        <strong style={{ color: "#071a2b", fontSize: 17 }}>{item.area}</strong>
                        <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.7, marginTop: 7 }}>
                          <div>
                            الانتقال: <b style={{ color: "#0b2f49" }}>
                              {fee > 0 ? `${fee.toLocaleString("ar-EG")} جنيه` : "بدون رسوم مسجلة"}
                            </b>
                          </div>
                          <div>
                            أيام الخدمة: <b style={{ color: "#0b2f49" }}>
                              {item.serviceDays || "يتم تأكيدها مع الطلب"}
                            </b>
                          </div>
                        </div>
                        <span style={{ color: "#0284c7", fontWeight: 900, marginTop: 10 }}>تفاصيل المنطقة ←</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <div style={ctaStyle}>
          <div>
            <strong style={{ fontSize: 18 }}>مش لاقي منطقتك؟</strong>
            <p style={{ color: "#c9e3ef", margin: "5px 0 0" }}>
              سيب رقمك أو ابدأ طلب، ونأكد لك إمكانية الخدمة.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="button" href="/order">ابدأ طلب</Link>
            <Link className="outline" href="/callback?service=استفسار عن منطقة الخدمة" style={{ background: "white" }}>
              اطلب مكالمة
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 15,
  padding: 16,
  boxShadow: "0 7px 22px rgba(7,26,43,.05)",
  textDecoration: "none",
  display: "grid",
};
const emptyStyle: React.CSSProperties = {
  marginTop: 22,
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 15,
  padding: 18,
  color: "#64748b",
  lineHeight: 1.8,
};
const ctaStyle: React.CSSProperties = {
  marginTop: 28,
  padding: 20,
  borderRadius: 18,
  background: "#0b2f49",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};
