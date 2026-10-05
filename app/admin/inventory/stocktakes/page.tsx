import { redirect } from "next/navigation";
import { can, currentUser, PERMISSIONS } from "@/lib/auth-v7";
import StocktakeManagement from "./StocktakeManagement";

export default async function StocktakesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, PERMISSIONS.STOCKTAKE_MANAGE, user.permissions)) redirect("/admin");

  return (
    <main className="admin" dir="rtl">
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "26px 18px 70px" }}>
        <h1 style={{ marginBottom: 6 }}>الجرد والتسويات</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          جرد مخزن الشركة أو عهدة أي فني مع حفظ المتوقع والفعلي والفروق. اعتماد الجرد ينشئ حركة تسوية ولا يمسح أي تاريخ قديم.
        </p>
        <StocktakeManagement />
      </section>
    </main>
  );
}
