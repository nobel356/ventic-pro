import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  can,
  requirePermission,
} from "@/lib/auth-v7";

export async function GET() {
  try {
    const actor = await requirePermission(
      PERMISSIONS.ORDERS_VIEW,
    );

    const canSeeSensitive = can(
      actor.role,
      PERMISSIONS.CUSTOMER_SENSITIVE,
      actor.permissions,
    );

    const orders = await prisma.order.findMany({
      where: {
        archivedAt: null,
      },
      select: {
        id: true,
        orderNo: true,
        status: true,
        estimatedTotal: true,
        governorate: true,
        area: true,
        address: true,
        preferredDate: true,
        preferredTime: true,
        technicianId: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      orders.map((order) => ({
        ...order,
        address: canSeeSensitive
          ? order.address
          : null,
        customer: {
          id: order.customer.id,
          name: order.customer.name,
          phone: canSeeSensitive
            ? order.customer.phone
            : null,
        },
      })),
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  } catch (error: any) {
    const message = error?.message;

    if (
      message === "UNAUTHENTICATED" ||
      message === "FORBIDDEN"
    ) {
      return NextResponse.json(
        {
          error: message,
        },
        {
          status:
            message === "UNAUTHENTICATED"
              ? 401
              : 403,
          headers: {
            "Cache-Control":
              "private, no-store, max-age=0",
          },
        },
      );
    }

    console.error(
      "ADMIN_ORDERS_LIST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        error:
          "تعذر تحميل الطلبات",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  }
}
