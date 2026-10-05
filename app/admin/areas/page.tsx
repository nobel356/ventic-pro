import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import AreasManagement from "./AreasManagement";

export default async function AreasPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.AREAS_MANAGE,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1350,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <h1 style={{ marginBottom: 6 }}>مناطق الخدمة</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          المنطقة الواحدة تتحكم في رسوم الانتقال وأيام الخدمة والفنيين المتاحين لها.
        </p>

        <AreasManagement />
      </section>
    </main>
  );
}
