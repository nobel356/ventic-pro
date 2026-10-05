import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import SearchCenter from "./SearchCenter";

export default async function SearchPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (
    !can(
      user.role,
      PERMISSIONS.GLOBAL_SEARCH,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <h1 style={{ marginBottom: 6 }}>البحث الشامل</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          نقطة وصول واحدة لكل بيانات التشغيل بدل فتح أكثر من قسم.
        </p>

        <SearchCenter />
      </section>
    </main>
  );
}
