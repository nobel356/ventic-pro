import { redirect } from "next/navigation";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import WeeklyGrowthReview from "./WeeklyGrowthReview";

export const dynamic = "force-dynamic";

export default async function WeeklyGrowthReviewPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!can(user.role, PERMISSIONS.REPORTS_VIEW, user.permissions)) {
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
        <WeeklyGrowthReview />
      </section>
    </main>
  );
}
