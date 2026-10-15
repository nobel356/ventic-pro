import { NextResponse } from "next/server";
import {
  requireArchiveActor,
  requireVaultUnlocked,
  logArchiveEvent,
} from "@/lib/archive-vault";
import { rawPrisma } from "@/lib/prisma";

type Kind =
  | "orders"
  | "users"
  | "customers"
  | "leads"
  | "suppliers"
  | "inventory";

function forbidden(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 409 },
  );
}

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      type: string;
      id: string;
    }>;
  },
) {
  try {
    const actor =
      await requireArchiveActor(
        "archive.restore",
      );

    if (
      actor.role !==
      "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "الحذف النهائي متاح لـ Super Admin فقط.",
        },
        { status: 403 },
      );
    }

    await requireVaultUnlocked(
      actor.id,
    );

    const body =
      await req.json();
    const confirm = String(
      body?.confirm || "",
    ).trim();

    if (
      confirm !== "حذف نهائي"
    ) {
      return NextResponse.json(
        {
          error:
            "اكتب «حذف نهائي» لتأكيد العملية.",
        },
        { status: 400 },
      );
    }

    const { type, id } =
      await params;
    const kind = type as Kind;

    if (
      ![
        "orders",
        "users",
        "customers",
        "leads",
        "suppliers",
        "inventory",
      ].includes(kind)
    ) {
      return NextResponse.json(
        {
          error:
            "نوع العنصر غير صحيح.",
        },
        { status: 400 },
      );
    }

    if (kind === "orders") {
      const item =
        await rawPrisma.order.findUnique({
          where: { id },
          select: {
            id: true,
            orderNo: true,
            archivedAt: true,
            customerId: true,
          },
        });

      if (
        !item ||
        !item.archivedAt
      ) {
        return NextResponse.json(
          {
            error:
              "الطلب غير موجود في الأرشيف.",
          },
          { status: 404 },
        );
      }

      const [
        invoices,
        payments,
        warranties,
        maintenance,
        complaints,
        reviews,
        movements,
        attachments,
        quotes,
        estimates,
        extraCharges,
        devices,
        leads,
      ] = await Promise.all([
        rawPrisma.invoice.count({
          where: { orderId: id },
        }),
        rawPrisma.payment.count({
          where: { orderId: id },
        }),
        rawPrisma.warranty.count({
          where: { orderId: id },
        }),
        rawPrisma.maintenanceRequest.count({
          where: { orderId: id },
        }),
        rawPrisma.complaint.count({
          where: { orderId: id },
        }),
        rawPrisma.review.count({
          where: { orderId: id },
        }),
        rawPrisma.inventoryMovement.count({
          where: { orderId: id },
        }),
        rawPrisma.attachment.count({
          where: { orderId: id },
        }),
        rawPrisma.quote.count({
          where: { orderId: id },
        }),
        rawPrisma.venticEstimate.count({
          where: { orderId: id },
        }),
        rawPrisma.extraCharge.count({
          where: { orderId: id },
        }),
        rawPrisma.device.count({
          where: {
            sourceOrderId: id,
          },
        }),
        rawPrisma.lead.count({
          where: {
            convertedOrderId: id,
          },
        }),
      ]);

      const blockers =
        invoices +
        payments +
        warranties +
        maintenance +
        complaints +
        reviews +
        movements +
        attachments +
        quotes +
        estimates +
        extraCharges +
        devices +
        leads;

      if (blockers > 0) {
        return forbidden(
          "لا يمكن حذف الطلب نهائيًا لأنه مرتبط بتاريخ مالي/تشغيلي أو صور/ضمان/متابعة. اتركه داخل الأرشيف.",
        );
      }

      await logArchiveEvent(
        actor,
        "ARCHIVE_ORDER_PURGED",
        {
          oldValue: {
            id: item.id,
            orderNo: item.orderNo,
            customerId:
              item.customerId,
            archivedAt:
              item.archivedAt.toISOString(),
          },
        },
      );

      await rawPrisma.order.delete({
        where: { id },
      });

      return NextResponse.json({
        ok: true,
      });
    }

    if (kind === "users") {
      const item =
        await rawPrisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            archivedAt: true,
          },
        });

      if (
        !item ||
        !item.archivedAt
      ) {
        return NextResponse.json(
          {
            error:
              "المستخدم غير موجود في الأرشيف.",
          },
          { status: 404 },
        );
      }

      const [
        assignedOrders,
        payments,
        maintenance,
        complaints,
        slots,
        reviews,
        movements,
        purchases,
        technicianStocktakes,
        createdStocktakes,
        approvedStocktakes,
        adminNotifications,
      ] = await Promise.all([
        rawPrisma.order.count({
          where: {
            technicianId: id,
          },
        }),
        rawPrisma.payment.count({
          where: {
            receivedById: id,
          },
        }),
        rawPrisma.maintenanceRequest.count({
          where: {
            technicianId: id,
          },
        }),
        rawPrisma.complaint.count({
          where: {
            technicianId: id,
          },
        }),
        rawPrisma.technicianSlot.count({
          where: {
            technicianId: id,
          },
        }),
        rawPrisma.review.count({
          where: {
            technicianId: id,
          },
        }),
        rawPrisma.inventoryMovement.count({
          where: {
            technicianId: id,
          },
        }),
        rawPrisma.purchaseReceipt.count({
          where: {
            receivedById: id,
          },
        }),
        rawPrisma.stocktake.count({
          where: {
            technicianId: id,
          },
        }),
        rawPrisma.stocktake.count({
          where: {
            createdById: id,
          },
        }),
        rawPrisma.stocktake.count({
          where: {
            approvedById: id,
          },
        }),
        rawPrisma.adminNotification.count({
          where: {
            recipientId: id,
          },
        }),
      ]);

      const blockers =
        assignedOrders +
        payments +
        maintenance +
        complaints +
        slots +
        reviews +
        movements +
        purchases +
        technicianStocktakes +
        createdStocktakes +
        approvedStocktakes +
        adminNotifications;

      if (blockers > 0) {
        return forbidden(
          "لا يمكن حذف المستخدم نهائيًا لأنه مرتبط بتاريخ تشغيل/مخزون/مدفوعات. اتركه داخل الأرشيف.",
        );
      }

      await logArchiveEvent(
        actor,
        "ARCHIVE_USER_PURGED",
        {
          oldValue: {
            id: item.id,
            name: item.name,
            email: item.email,
            archivedAt:
              item.archivedAt.toISOString(),
          },
        },
      );

      await rawPrisma.user.delete({
        where: { id },
      });

      return NextResponse.json({
        ok: true,
      });
    }

    if (kind === "customers") {
      const item =
        await rawPrisma.customer.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            phone: true,
            archivedAt: true,
          },
        });

      if (
        !item ||
        !item.archivedAt
      ) {
        return NextResponse.json(
          {
            error:
              "العميل غير موجود في الأرشيف.",
          },
          { status: 404 },
        );
      }

      const [
        orders,
        properties,
      ] = await Promise.all([
        rawPrisma.order.count({
          where: {
            customerId: id,
          },
        }),
        rawPrisma.property.count({
          where: {
            customerId: id,
          },
        }),
      ]);

      if (
        orders > 0 ||
        properties > 0
      ) {
        return forbidden(
          "لا يمكن حذف العميل نهائيًا لأنه مرتبط بطلبات أو عقارات/أجهزة. اتركه داخل الأرشيف.",
        );
      }

      await logArchiveEvent(
        actor,
        "ARCHIVE_CUSTOMER_PURGED",
        {
          oldValue: {
            id: item.id,
            name: item.name,
            phone: item.phone,
            archivedAt:
              item.archivedAt.toISOString(),
          },
        },
      );

      await rawPrisma.customer.delete({
        where: { id },
      });

      return NextResponse.json({
        ok: true,
      });
    }

    if (kind === "leads") {
      const item =
        await rawPrisma.lead.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            phone: true,
            convertedOrderId: true,
            archivedAt: true,
          },
        });

      if (
        !item ||
        !item.archivedAt
      ) {
        return NextResponse.json(
          {
            error:
              "الـLead غير موجود في الأرشيف.",
          },
          { status: 404 },
        );
      }

      if (
        item.convertedOrderId
      ) {
        return forbidden(
          "لا يمكن حذف Lead نهائيًا لأنه تحول إلى طلب.",
        );
      }

      await logArchiveEvent(
        actor,
        "ARCHIVE_LEAD_PURGED",
        {
          oldValue: {
            id: item.id,
            name: item.name,
            phone: item.phone,
            archivedAt:
              item.archivedAt.toISOString(),
          },
        },
      );

      await rawPrisma.lead.delete({
        where: { id },
      });

      return NextResponse.json({
        ok: true,
      });
    }

    if (kind === "suppliers") {
      const item =
        await rawPrisma.supplier.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            archivedAt: true,
          },
        });

      if (
        !item ||
        !item.archivedAt
      ) {
        return NextResponse.json(
          {
            error:
              "المورد غير موجود في الأرشيف.",
          },
          { status: 404 },
        );
      }

      const purchases =
        await rawPrisma.purchaseReceipt.count({
          where: {
            supplierId: id,
          },
        });

      if (purchases > 0) {
        return forbidden(
          "لا يمكن حذف المورد نهائيًا لأنه مرتبط بتوريدات تاريخية.",
        );
      }

      await logArchiveEvent(
        actor,
        "ARCHIVE_SUPPLIER_PURGED",
        {
          oldValue: {
            id: item.id,
            name: item.name,
            archivedAt:
              item.archivedAt.toISOString(),
          },
        },
      );

      await rawPrisma.supplier.delete({
        where: { id },
      });

      return NextResponse.json({
        ok: true,
      });
    }

    const item =
      await rawPrisma.inventoryItem.findUnique({
        where: { id },
        select: {
          id: true,
          sku: true,
          nameAr: true,
          quantity: true,
          archivedAt: true,
        },
      });

    if (
      !item ||
      !item.archivedAt
    ) {
      return NextResponse.json(
        {
          error:
            "صنف المخزون غير موجود في الأرشيف.",
        },
        { status: 404 },
      );
    }

    const [
      movements,
      purchases,
      stocktakes,
    ] = await Promise.all([
      rawPrisma.inventoryMovement.count({
        where: { itemId: id },
      }),
      rawPrisma.purchaseReceiptItem.count({
        where: { itemId: id },
      }),
      rawPrisma.stocktakeLine.count({
        where: { itemId: id },
      }),
    ]);

    if (
      Math.abs(
        Number(item.quantity),
      ) > 0.000001 ||
      movements > 0 ||
      purchases > 0 ||
      stocktakes > 0
    ) {
      return forbidden(
        "لا يمكن حذف صنف المخزون نهائيًا لأنه مرتبط برصيد أو حركة أو توريد أو جرد.",
      );
    }

    await logArchiveEvent(
      actor,
      "ARCHIVE_INVENTORY_ITEM_PURGED",
      {
        oldValue: {
          id: item.id,
          sku: item.sku,
          nameAr: item.nameAr,
          archivedAt:
            item.archivedAt.toISOString(),
        },
      },
    );

    await rawPrisma.inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر الحذف النهائي.",
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
