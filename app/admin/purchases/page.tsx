import { redirect } from "next/navigation";
import { can, currentUser, PERMISSIONS } from "@/lib/auth-v7";
import PurchasesManagement from "./PurchasesManagement";

export default async function PurchasesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const allowed =
    can(user.role, PERMISSIONS.PURCHASES_MANAGE, user.permissions) ||
    can(user.role, PERMISSIONS.SUPPLIERS_MANAGE, user.permissions);

  if (!allowed) redirect("/admin");

  return (
    <main className="admin" dir="rtl">
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "26px 18px 70px" }}>
        <h1 style={{ marginBottom: 6 }}>المشتريات والموردون</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          تسجيل التوريد مرة واحدة يضيف الكمية للمخزون ويحدث آخر ومتوسط تكلفة ويسجل الحركة والمورد في نفس العملية.
        </p>
        <PurchasesManagement />
      </section>
    </main>
  );
}
