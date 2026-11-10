import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import CroExperimentCenter from "./CroExperimentCenter";

export const dynamic = "force-dynamic";

export default async function CroExperimentsPage() {
  const user =
    await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    !can(
      user.role,
      PERMISSIONS.BLOG_MANAGE,
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
          maxWidth: 1500,
          margin: "0 auto",
          padding:
            "26px 18px 70px",
        }}
      >
        <CroExperimentCenter />
      </section>
    </main>
  );
}
