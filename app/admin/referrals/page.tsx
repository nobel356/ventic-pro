import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { loadReferralCodes } from "@/lib/referrals";
import ReferralManager from "./ReferralManager";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  try {
    await requirePermission(PERMISSIONS.PROMOTIONS_MANAGE);
  } catch {
    redirect("/admin");
  }

  const codes = await loadReferralCodes(prisma);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://ventic-pro-v11-7.vercel.app";

  return (
    <main className="admin" dir="rtl">
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "24px 18px 70px",
        }}
      >
        <h1 style={{ marginBottom: 6 }}>نظام الإحالة</h1>
        <p style={{ color: "#64748b", marginTop: 0, lineHeight: 1.8 }}>
          أنشئ كود إحالة، حدد خصم العميل ومكافأة صاحب الكود، وتابع عدد الاستخدامات. النظام لا يكدّس خصم الإحالة فوق كوبون آخر في نفس الطلب.
        </p>

        <ReferralManager initialCodes={codes} appUrl={appUrl} />
      </section>
    </main>
  );
}
