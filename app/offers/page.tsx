import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "العروض والكوبونات",
  description: "العروض والكوبونات النشطة حاليًا في Ventic Pro.",
  alternates: { canonical: "/offers" },
};

export default async function OffersPage() {
  const now = new Date();

  const coupons = await prisma.coupon.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ endsAt: "asc" }, { createdAt: "desc" }],
  });

  const active = coupons.filter(
    (item) => item.maxUses === null || item.usedCount < item.maxUses,
  );

  return (
    <main dir="rtl" style={{ minHeight: "70vh", background: "#f4f8fb", padding: "80px 16px 50px" }}>
      <section style={{ maxWidth: 1050, margin: "0 auto" }}>
        <span style={{ color: "#0284c7", fontWeight: 900, fontSize: 13 }}>وفر في طلبك</span>
        <h1 style={{ color: "#071a2b", fontSize: "clamp(34px,6vw,52px)", margin: "7px 0 10px" }}>
          العروض الحالية
        </h1>
        <p style={{ color: "#64748b", lineHeight: 1.85 }}>
          العروض هنا جاية مباشرة من نظام Ventic Pro، لذلك أي عرض منتهي أو موقوف لا يظهر للعميل.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginTop: 20 }}>
          {active.map((item) => {
            const value = Number(item.value);
            const discount = item.type === "PERCENT" ? `${value}%` : `${value.toLocaleString("ar-EG")} جنيه`;

            return (
              <article key={item.id} style={cardStyle} data-track="offer_view" data-track-label={item.code}>
                <span style={badgeStyle}>عرض نشط</span>
                <h2 style={{ color: "#0b2f49", marginBottom: 7 }}>
                  {item.name || `خصم ${discount}`}
                </h2>
                {item.description && (
                  <p style={{ color: "#64748b", lineHeight: 1.8 }}>{item.description}</p>
                )}

                <div style={codeStyle}>{item.code}</div>

                <div style={{ display: "grid", gap: 5, color: "#475569", fontSize: 13, marginTop: 12 }}>
                  <span>قيمة الخصم: <strong>{discount}</strong></span>
                  {item.minOrder && <span>الحد الأدنى: <strong>{Number(item.minOrder).toLocaleString("ar-EG")} ج</strong></span>}
                  {item.endsAt && <span>ينتهي: <strong>{item.endsAt.toLocaleDateString("ar-EG")}</strong></span>}
                </div>

                <Link
                  className="button"
                  href={`/order?utm_source=Organic&utm_medium=offers&utm_campaign=${encodeURIComponent(item.code)}`}
                  data-track="order_intent"
                  data-track-label={`offer:${item.code}`}
                  style={{ marginTop: 14 }}
                >
                  استخدم العرض في طلبك
                </Link>
              </article>
            );
          })}

          {active.length === 0 && (
            <div style={cardStyle}>
              <strong style={{ color: "#0b2f49" }}>مفيش عروض عامة نشطة حاليًا.</strong>
              <p style={{ color: "#64748b" }}>تقدر تبدأ طلبك عادي أو تتابع الصفحة للعروض القادمة.</p>
              <Link className="button" href="/order">ابدأ طلب</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #dbe7ef",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 9px 26px rgba(7,26,43,.06)",
};
const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 900,
};
const codeStyle: React.CSSProperties = {
  display: "inline-block",
  direction: "ltr",
  border: "1px dashed #93c5fd",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 10,
  padding: "9px 12px",
  fontWeight: 900,
  letterSpacing: ".08em",
};
