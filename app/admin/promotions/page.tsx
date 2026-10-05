import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import PromotionsManagement from "./PromotionsManagement";

export default async function PromotionsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.PROMOTIONS_MANAGE,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <h1 style={{ marginBottom: 6 }}>العروض والكوبونات</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          العرض يُعرّف مرة واحدة ثم يطبق تلقائيًا عند تحقق شروطه.
        </p>

        <PromotionsManagement />
      </section>
    </main>
  );
}
