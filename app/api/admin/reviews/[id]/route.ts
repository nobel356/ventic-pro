import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission(PERMISSIONS.REVIEWS_MANAGE);
    const { id } = await params;
    const body = await req.json();
    const publish = body?.publish === true;

    const current = await prisma.review.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            orderNo: true,
            customer: { select: { name: true } },
          },
        },
      },
    });

    if (!current) {
      return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });
    }

    if (publish && (!current.publicConsent || !current.comment || current.overall < 4)) {
      return NextResponse.json(
        {
          error:
            "لا يمكن نشر التقييم إلا إذا وافق العميل على النشر، وكتب تعليقًا، وكان التقييم 4 نجوم أو أكثر.",
        },
        { status: 409 },
      );
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        orderId: current.orderId,
        actorId: actor.id,
        actorLabel: actor.name,
        action: publish ? "REVIEW_PUBLISHED" : "REVIEW_UNPUBLISHED",
        oldValue: { isPublished: current.isPublished },
        newValue: {
          reviewId: current.id,
          isPublished: updated.isPublished,
          customerName: current.order.customer.name,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تحديث التقييم" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
