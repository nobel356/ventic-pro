import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import InventoryManagement from "./InventoryManagement";

export default async function InventoryPage() {
  const user = await currentUser();

  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.INVENTORY_VIEW,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ marginBottom: 6 }}>المخزون والخامات</h1>
          <p style={{ color: "#64748b", margin: 0 }}>
            مخزن الشركة ومخزون الفنيين وحركة وارد وصرف وتحويل وتسوية بسجل دائم لا يتم مسحه.
          </p>
        </div>

        <InventoryManagement />
      </section>
    </main>
  );
}
