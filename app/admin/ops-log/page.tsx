import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-v7";
import OpsChangeLog from "./OpsChangeLog";

export const dynamic = "force-dynamic";

export default async function OpsChangeLogPage() {
  const user =
    await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    user.role !==
    "SUPER_ADMIN"
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
          maxWidth: 1300,
          margin: "0 auto",
          padding:
            "26px 18px 70px",
        }}
      >
        <OpsChangeLog />
      </section>
    </main>
  );
}
