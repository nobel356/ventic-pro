import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-v7";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedTake = Number(searchParams.get("take") || 30);
  const take = Number.isFinite(requestedTake)
    ? Math.min(50, Math.max(1, requestedTake))
    : 30;

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

  return NextResponse.json({ items, unread });
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
