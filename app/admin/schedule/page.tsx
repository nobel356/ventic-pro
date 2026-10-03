import Link from "next/link";
import TechnicianCalendar from "./TechnicianCalendar";

export default function SchedulePage() {
  return (
    <main className="admin" dir="rtl">
      <header>
        <div className="brand">
          <i>V</i> Ventic Pro
        </div>
        <nav>
          <Link href="/admin">الرئيسية</Link>
          <Link href="/admin/orders">الطلبات</Link>
          <Link href="/admin/schedule">جدول الفنيين</Link>
          <Link href="/admin/technicians">الفنيون</Link>
          <Link href="/admin/pricing">الأسعار</Link>
        </nav>
      </header>

      <section
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "26px 18px 60px",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ marginBottom: 6 }}>جدول ومواعيد الفنيين</h1>
          <p style={{ color: "#64748b", margin: 0 }}>
            عرض يومي وأسبوعي، إنشاء المواعيد ومنع حجز الفني في وقتين متعارضين.
          </p>
        </div>

        <TechnicianCalendar />
      </section>
    </main>
  );
}
