import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/customer-auth";
import { notifyAdmins } from "@/lib/admin-notifications";

export async function GET() {
  const customer = await currentCustomer();

  if (!customer) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const orders = await prisma.order.findMany({
    where: {
      customerId: customer.id,
      status: "COMPLETED",
    },
    include: {
      property: {
        include: {
          devices: {
            where: { active: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      warranties: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      maintenanceRequests: {
        orderBy: { createdAt: "desc" },
      },
      complaints: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      orderNo: order.orderNo,
      propertyId: order.propertyId,
      propertyLabel:
        order.property?.label ||
        order.address ||
        "العقار",
      warranty: order.warranties[0]
        ? {
            id: order.warranties[0].id,
            status:
              order.warranties[0].status,
            endsAt:
              order.warranties[0].endsAt,
          }
        : null,
      devices:
        order.property?.devices
          .filter(
            (device) =>
              !device.sourceOrderId ||
              device.sourceOrderId ===
                order.id,
          )
          .map((device) => ({
            id: device.id,
            type: device.type,
            brand: device.brand,
            model: device.model,
          })) || [],
      maintenance:
        order.maintenanceRequests,
      complaints: order.complaints,
    })),
  });
}

export async function POST(
  req: Request,
) {
  const customer =
    await currentCustomer();

  if (!customer) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const kind = String(
      body?.kind || "",
    );
    const orderId = String(
      body?.orderId || "",
    );
    const deviceId = body?.deviceId
      ? String(body.deviceId)
      : null;
    const issue = String(
      body?.issue || "",
    ).trim();

    if (
      ![
        "MAINTENANCE",
        "COMPLAINT",
      ].includes(kind) ||
      !orderId ||
      !issue
    ) {
      return NextResponse.json(
        {
          error:
            "أكمل بيانات الطلب والمشكلة",
        },
        { status: 400 },
      );
    }

    const order =
      await prisma.order.findFirst({
        where: {
          id: orderId,
          customerId: customer.id,
          status: "COMPLETED",
        },
        include: {
          warranties: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

    if (!order) {
      return NextResponse.json(
        {
          error:
            "الطلب غير متاح لما بعد التركيب",
        },
        { status: 404 },
      );
    }

    if (deviceId) {
      const device =
        await prisma.device.findFirst({
          where: {
            id: deviceId,
            property: {
              customerId:
                customer.id,
            },
          },
        });

      if (!device) {
        return NextResponse.json(
          {
            error:
              "الجهاز غير تابع لحسابك",
          },
          { status: 400 },
        );
      }
    }

    const warranty =
      order.warranties[0] || null;
    const warrantyActive =
      Boolean(warranty) &&
      warranty!.status === "ACTIVE" &&
      warranty!.endsAt >
        new Date();

    if (kind === "MAINTENANCE") {
      const ticket =
        await prisma.maintenanceRequest.create({
          data: {
            orderId: order.id,
            propertyId:
              order.propertyId,
            deviceId,
            warrantyId:
              warrantyActive
                ? warranty!.id
                : null,
            issue,
            costType:
              warrantyActive
                ? "WARRANTY"
                : "PAID",
            createdByCustomer:
              true,
          },
        });

      await notifyAdmins({
        type:
          AdminNotificationType.MAINTENANCE_REQUEST,
        title: `طلب صيانة من العميل — ${order.orderNo}`,
        message: `${customer.name}: ${issue}`,
        orderId: order.id,
        href: "/admin/aftercare",
        dedupeKey: `maintenance:${ticket.id}`,
      });

      return NextResponse.json(
        {
          ok: true,
          id: ticket.id,
        },
        { status: 201 },
      );
    }

    const ticket =
      await prisma.complaint.create({
        data: {
          orderId: order.id,
          propertyId:
            order.propertyId,
          deviceId,
          issue,
          costType: "FREE",
          freeRevisit: true,
          createdByCustomer: true,
        },
      });

    await notifyAdmins({
      type:
        AdminNotificationType.COMPLAINT,
      title: `شكوى من العميل — ${order.orderNo}`,
      message: `${customer.name}: ${issue}`,
      orderId: order.id,
      href: "/admin/aftercare",
      dedupeKey: `complaint:${ticket.id}`,
    });

    return NextResponse.json(
      {
        ok: true,
        id: ticket.id,
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر إرسال الطلب",
      },
      { status: 500 },
    );
  }
}
