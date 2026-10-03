import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import CustomerManagement from "./CustomerManagement";

export default async function CustomersPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  const canView =
    can(
      user.role,
      PERMISSIONS.CUSTOMER_SENSITIVE,
      user.permissions,
    ) ||
    can(
      user.role,
      PERMISSIONS.CUSTOMER_ACCOUNTS_EDIT,
      user.permissions,
    );

  if (!canView) {
    redirect("/admin");
  }

  const canEdit = can(
    user.role,
    PERMISSIONS.CUSTOMER_ACCOUNTS_EDIT,
    user.permissions,
  );

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1380,
          margin: "0 auto",
          padding: "26px 18px 70px",
        }}
      >
        <div
          style={{
            marginBottom: 20,
          }}
        >
          <h1
            style={{
              marginBottom: 6,
            }}
          >
            العملاء وحساباتهم
          </h1>
          <p
            style={{
              color: "#64748b",
              margin: 0,
            }}
          >
            بيانات العميل وحالة حسابه وطلباته وفواتيره في مكان واحد. أي تعديل حساس يتم تسجيله في Audit Log.
          </p>
        </div>

        <CustomerManagement
          canEdit={canEdit}
        />
      </section>
    </main>
  );
}
