import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import BlogPerformanceDashboard from "../BlogPerformanceDashboard";

export default async function BlogPerformancePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

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
      dir="rtl"
      style={{
        width: "min(1450px,calc(100% - 28px))",
        margin: "0 auto",
        padding: "20px 0 90px",
      }}
    >
      <BlogPerformanceDashboard />
    </main>
  );
}
