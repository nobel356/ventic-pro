import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

export async function POST(req: Request) {
  try {
    const user = await requirePermission(
      PERMISSIONS.EXTRA_APPROVE,
    );

    const {
      orderId,
      title,
      reason,
      amount,
    } = await req.json();

    const numericAmount =
      Number(amount);

    if (
      !orderId ||
      !String(title || "").trim() ||
      !String(reason || "").trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "بيانات التكلفة الإضافية غير مكتملة",
        },
        { status: 400 },
      );
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: String(orderId),
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!order) {
      return NextResponse.json(
        {
          error:
            "الطلب غير موجود",
        },
        { status: 404 },
      );
    }

    if (
      order.status === "COMPLETED" ||
      order.status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكن إضافة تكلفة لطلب مكتمل أو ملغي",
        },
        { status: 409 },
      );
    }

    const token = crypto
      .randomBytes(32)
      .toString("hex");

    const item =
      await prisma.extraCharge.create({
        data: {
          orderId: order.id,
          title:
            String(title).trim(),
          reason:
            String(reason).trim(),
          amount:
            numericAmount,
          customerToken: token,
          requestedById:
            user.id,
        },
      });

    await prisma.auditLog.create({
      data: {
        orderId: order.id,
        actorId: user.id,
        actorLabel:
          user.name,
        action:
          "EXTRA_CHARGE_REQUESTED",
        newValue: {
          extraChargeId:
            item.id,
          title:
            item.title,
          amount:
            numericAmount,
        },
      },
    });

    return NextResponse.json({
      id: item.id,
      approvalPath:
        `/customer/approval/${token}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر إنشاء التكلفة الإضافية",
      },
      {
        status:
          error?.message ===
          "UNAUTHENTICATED"
            ? 401
            : error?.message ===
                "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
