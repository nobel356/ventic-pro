import Link from "next/link";
import TechnicianManagement from "./TechnicianManagement";

export default function TechniciansPage() {
  return (
    <main className="admin" dir="rtl">
      <header>
        <div className="brand"><i>V</i> Ventic Pro</div>
        <nav>
          <Link href="/admin/orders">الطلبات</Link>
          <Link href="/admin/technicians">الفنيون</Link>
          <Link href="/admin/pricing">الأسعار</Link>
          <Link href="/admin/users">المستخدمون</Link>
        </nav>
      </header>
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "26px 18px 60px" }}>
        <h1 style={{ marginBottom: 6 }}>الفنيون</h1>
        <p style={{ color: "#64748b", marginTop: 0, marginBottom: 22 }}>
          إدارة حسابات الفنيين وتعديل بيانات الفنيين الموجودين.
        </p>
        <TechnicianManagement />
      </section>
    </main>
  );
}
