import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import GrowthExecutionCenter from "./GrowthExecutionCenter";

export const dynamic =
  "force-dynamic";

export default async function GrowthExecutionPage() {
  const user =
    await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    !can(
      user.role,
      PERMISSIONS.REPORTS_VIEW,
      user.permissions,
    )
  ) {
    redirect("/admin");
  }

  return (
    <main
      className="admin"
      dir="rtl"
    >
      <section
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding:
            "26px 18px 70px",
        }}
      >
        <GrowthExecutionCenter
          isSuperAdmin={
            user.role ===
            "SUPER_ADMIN"
          }
        />
      </section>
    </main>
  );
}
