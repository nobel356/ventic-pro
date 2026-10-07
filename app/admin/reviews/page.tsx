import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import ReviewsManagement from "./ReviewsManagement";

export default async function AdminReviewsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!can(user.role, PERMISSIONS.REVIEWS_MANAGE, user.permissions)) {
    redirect("/admin");
  }

  const reviews = await prisma.review.findMany({
    include: {
      order: {
        select: {
          orderNo: true,
          customer: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <main className="admin" dir="rtl">
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "26px 18px 70px" }}>
        <h1 style={{ marginBottom: 6 }}>تقييمات العملاء</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          لا يتم نشر أي تعليق إلا بموافقة العميل وبعد المراجعة، ولا تظهر بياناته الحساسة للعامة.
        </p>

        <ReviewsManagement
          initialReviews={reviews.map((review) => ({
            id: review.id,
            orderNo: review.order.orderNo,
            customerName: review.order.customer.name,
            overall: review.overall,
            comment: review.comment,
            publicConsent: review.publicConsent,
            isPublished: review.isPublished,
            createdAt: review.createdAt.toISOString(),
            punctuality: review.punctuality,
            professionalism: review.professionalism,
            installationQuality: review.installationQuality,
            cleanliness: review.cleanliness,
            communication: review.communication,
            valueForMoney: review.valueForMoney,
          }))}
        />
      </section>
    </main>
  );
}
