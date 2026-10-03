import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import ExecutionWorkspace from "@/app/shared/ExecutionWorkspace";

export default async function AdminExecuteOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(
    PERMISSIONS.ORDERS_EDIT,
  );

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNo: true,
      technicianId: true,
    },
  });

  if (!order) notFound();

  return (
    <main
      dir="rtl"
      style={{
        padding: "24px 18px 70px",
      }}
    >
      <ExecutionWorkspace
        orderId={id}
        apiBase={`/api/admin/orders/${id}/execution`}
        backHref={`/admin/orders/${id}`}
        title="تنفيذ ومتابعة الطلب"
        adminMode
      />
    </main>
  );
}
