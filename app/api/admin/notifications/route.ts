import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-v7";
import { notifyAdmins } from "@/lib/admin-notifications";

function staleWindowMinutes() {
  const configured = Number(process.env.ORDER_STALE_NOTIFICATION_MINUTES || 30);
  return Number.isFinite(configured) && configured >= 5 ? configured : 30;
}

async function createStaleOrderAlerts() {
  const minutes = staleWindowMinutes();
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const staleOrders = await prisma.order.findMany({
    where: { status: "NEW", createdAt: { lte: cutoff } },
    select: {
      id: true,
      orderNo: true,
      area: true,
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 25,
  });

  await Promise.all(
    staleOrders.map((order) =>
      notifyAdmins({
        type: AdminNotificationType.ORDER_STALE,
        title: `طلب جديد بدون تأكيد — ${order.orderNo}`,
        message: `الطلب باسم ${order.customer.name}${order.area ? ` في ${order.area}` : ""} ما زال جديدًا منذ أكثر من ${minutes} دقيقة.`,
        orderId: order.id,
        href: `/admin/orders/${order.id}`,
        dedupeKey: `stale-order:${order.id}:${minutes}`,
      }),
    ),
  );
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  await createStaleOrderAlerts();

  const { searchParams } = new URL(req.url);
  const requestedTake = Number(searchParams.get("take") || 50);
  const take = Number.isFinite(requestedTake)
    ? Math.min(100, Math.max(1, requestedTake))
    : 50;

  const [items, unread] = await Promise.all([
    prisma.adminNotification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        href: true,
        isRead: true,
        createdAt: true,
        orderId: true,
      },
    }),
    prisma.adminNotification.count({
      where: { recipientId: user.id, isRead: false },
    }),
  ]);

  return NextResponse.json({ items, unread, staleMinutes: staleWindowMinutes() });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await req.json();
  const now = new Date();

  if (body?.all === true) {
    await prisma.adminNotification.updateMany({
      where: { recipientId: user.id, isRead: false },
      data: { isRead: true, readAt: now },
    });
    return NextResponse.json({ ok: true });
  }

  const id = String(body?.id || "");
  if (!id) {
    return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  }

  await prisma.adminNotification.updateMany({
    where: { id, recipientId: user.id },
    data: { isRead: true, readAt: now },
  });

  return NextResponse.json({ ok: true });
}
