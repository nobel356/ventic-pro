import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-v7";
import UserManagement from "./UserManagement";

export default async function UsersPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") redirect("/admin");

  return (
    <main className="admin" dir="rtl">
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 18px 60px" }}>
        <div style={{ marginBottom: 22 }}>
          <Link href="/admin">← العودة للوحة التشغيل</Link>
          <h1 style={{ marginBottom: 6 }}>المستخدمون والصلاحيات</h1>
          <p style={{ color: "#64748b", margin: 0 }}>
            إنشاء حسابات الإدارة وخدمة العملاء والفنيين وتحديد صلاحيات كل حساب.
          </p>
        </div>
        <UserManagement currentUserId={user.id} />
      </section>
    </main>
  );
}
