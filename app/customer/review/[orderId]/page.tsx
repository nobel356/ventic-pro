import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/customer-auth";
import ReviewForm from "./ReviewForm";

export default async function CustomerReviewPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const customer = await currentCustomer();
  if (!customer) redirect("/customer/login");

  const { orderId } = await params;
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: customer.id,
    },
    include: {
      review: true,
    },
  });

  if (!order) notFound();

  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#f5f8fb", padding: "24px 16px 70px" }}>
      <section style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/customer/account">← حسابي</Link>
        <h1>تقييم الخدمة</h1>
        <p style={{ color: "#64748b" }}>
          الطلب {order.orderNo}
        </p>

        {order.status !== "COMPLETED" ? (
          <div style={{ background: "white", padding: 18, borderRadius: 14 }}>
            التقييم متاح بعد إتمام التركيب.
          </div>
        ) : order.review ? (
          <div style={{ background: "white", padding: 18, borderRadius: 14 }}>
            شكرًا، تم تقييم هذا الطلب بالفعل.
          </div>
        ) : (
          <ReviewForm orderId={order.id} />
        )}
      </section>
    </main>
  );
}
