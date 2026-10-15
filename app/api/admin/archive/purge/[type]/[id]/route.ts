import { NextResponse } from "next/server";
import {
  requireArchiveActor,
  requireVaultUnlocked,
} from "@/lib/archive-vault";
import { rawPrisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/storage";

type Kind =
  | "orders"
  | "users"
  | "customers"
  | "leads"
  | "suppliers"
  | "inventory";

async function purgeOrder(
  tx: any,
  id: string,
) {
  await tx.lead.updateMany({
    where: {
      convertedOrderId: id,
    },
    data: {
      convertedOrderId: null,
    },
  });

  await tx.notification.deleteMany({
    where: {
      orderId: id,
    },
  });

  await tx.adminNotification.deleteMany({
    where: {
      orderId: id,
    },
  });

  await tx.auditLog.deleteMany({
    where: {
      orderId: id,
    },
  });

  await tx.technicianSlot.deleteMany({
    where: {
      orderId: id,
    },
  });

  await tx.inventoryMovement.deleteMany({
    where: {
      orderId: id,
    },
  });

  await tx.device.deleteMany({
    where: {
      sourceOrderId: id,
    },
  });

  // Warranty has a restrictive relation to Order, so remove
  // aftercare rows and warranty rows explicitly before Order.
  await tx.maintenanceRequest.deleteMany({
    where: {
      orderId: id,
    },
  });

  await tx.complaint.deleteMany({
    where: {
      orderId: id,
    },
  });

  await tx.warranty.deleteMany({
    where: {
      orderId: id,
    },
  });

  await tx.order.delete({
    where: { id },
  });
}

async function purgeUser(
  tx: any,
  id: string,
) {
  await tx.session.deleteMany({
    where: {
      userId: id,
    },
  });

  await tx.technicianSlot.deleteMany({
    where: {
      technicianId: id,
    },
  });

  await tx.adminNotification.deleteMany({
    where: {
      recipientId: id,
    },
  });

  await tx.order.updateMany({
    where: {
      technicianId: id,
    },
    data: {
      technicianId: null,
    },
  });

  await tx.extraCharge.updateMany({
    where: {
      requestedById: id,
    },
    data: {
      requestedById: null,
    },
  });

  await tx.payment.updateMany({
    where: {
      receivedById: id,
    },
    data: {
      receivedById: null,
    },
  });

  await tx.maintenanceRequest.updateMany({
    where: {
      technicianId: id,
    },
    data: {
      technicianId: null,
    },
  });

  await tx.complaint.updateMany({
    where: {
      technicianId: id,
    },
    data: {
      technicianId: null,
    },
  });

  await tx.review.updateMany({
    where: {
      technicianId: id,
    },
    data: {
      technicianId: null,
    },
  });

  await tx.inventoryMovement.updateMany({
    where: {
      technicianId: id,
    },
    data: {
      technicianId: null,
    },
  });

  await tx.purchaseReceipt.updateMany({
    where: {
      receivedById: id,
    },
    data: {
      receivedById: null,
    },
  });

  await tx.stocktake.updateMany({
    where: {
      technicianId: id,
    },
    data: {
      technicianId: null,
    },
  });

  await tx.stocktake.updateMany({
    where: {
      createdById: id,
    },
    data: {
      createdById: null,
    },
  });

  await tx.stocktake.updateMany({
    where: {
      approvedById: id,
    },
    data: {
      approvedById: null,
    },
  });

  // Keep immutable audit text, but detach the FK to the removed user.
  await tx.auditLog.updateMany({
    where: {
      actorId: id,
    },
    data: {
      actorId: null,
    },
  });

  await tx.user.delete({
    where: { id },
  });
}

async function purgeCustomer(
  tx: any,
  id: string,
) {
  const orders =
    await tx.order.findMany({
      where: {
        customerId: id,
      },
      select: {
        id: true,
      },
    });

  for (const order of orders) {
    await purgeOrder(
      tx,
      order.id,
    );
  }

  await tx.notification.deleteMany({
    where: {
      customerId: id,
    },
  });

  await tx.customer.delete({
    where: { id },
  });
}

async function purgeSupplier(
  tx: any,
  id: string,
) {
  const receipts =
    await tx.purchaseReceipt.findMany({
      where: {
        supplierId: id,
      },
      select: {
        id: true,
      },
    });

  const receiptIds =
    receipts.map(
      (receipt: any) =>
        receipt.id,
    );

  if (receiptIds.length) {
    await tx.inventoryMovement.deleteMany({
      where: {
        purchaseReceiptId: {
          in: receiptIds,
        },
      },
    });

    await tx.purchaseReceipt.deleteMany({
      where: {
        id: {
          in: receiptIds,
        },
      },
    });
  }

  await tx.supplier.delete({
    where: { id },
  });
}

async function purgeInventoryItem(
  tx: any,
  id: string,
) {
  const purchaseLines =
    await tx.purchaseReceiptItem.findMany({
      where: {
        itemId: id,
      },
      select: {
        purchaseReceiptId: true,
      },
    });

  const receiptIds = [
    ...new Set(
      purchaseLines.map(
        (line: any) =>
          line.purchaseReceiptId,
      ),
    ),
  ];

  await tx.inventoryMovement.deleteMany({
    where: {
      itemId: id,
    },
  });

  await tx.stocktakeLine.deleteMany({
    where: {
      itemId: id,
    },
  });

  await tx.purchaseReceiptItem.deleteMany({
    where: {
      itemId: id,
    },
  });

  for (const receiptId of receiptIds) {
    const remaining =
      await tx.purchaseReceiptItem.findMany({
        where: {
          purchaseReceiptId:
            receiptId,
        },
        select: {
          lineTotal: true,
        },
      });

    const total =
      remaining.reduce(
        (
          sum: number,
          line: any,
        ) =>
          sum +
          Number(
            line.lineTotal || 0,
          ),
        0,
      );

    await tx.purchaseReceipt.update({
      where: {
        id: receiptId,
      },
      data: {
        total,
      },
    });
  }

  await tx.inventoryItem.delete({
    where: { id },
  });
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

    if (
      String(
        body?.confirm || "",
      ).trim() !==
      "حذف نهائي"
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

    const exists =
      kind === "orders"
        ? await rawPrisma.order.findUnique({
            where: { id },
            select: {
              archivedAt: true,
            },
          })
        : kind === "users"
          ? await rawPrisma.user.findUnique({
              where: { id },
              select: {
                archivedAt: true,
              },
            })
          : kind === "customers"
            ? await rawPrisma.customer.findUnique({
                where: { id },
                select: {
                  archivedAt: true,
                },
              })
            : kind === "leads"
              ? await rawPrisma.lead.findUnique({
                  where: { id },
                  select: {
                    archivedAt: true,
                  },
                })
              : kind === "suppliers"
                ? await rawPrisma.supplier.findUnique({
                    where: { id },
                    select: {
                      archivedAt: true,
                    },
                  })
                : await rawPrisma.inventoryItem.findUnique({
                    where: { id },
                    select: {
                      archivedAt: true,
                    },
                  });

    if (
      !exists ||
      !exists.archivedAt
    ) {
      return NextResponse.json(
        {
          error:
            "العنصر غير موجود في Archive Vault.",
        },
        { status: 404 },
      );
    }

    if (
      kind === "users" &&
      id === actor.id
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك حذف حسابك الحالي.",
        },
        { status: 400 },
      );
    }

    let attachmentPaths: string[] = [];

    if (kind === "orders") {
      const attachments =
        await rawPrisma.attachment.findMany({
          where: {
            orderId: id,
          },
          select: {
            storagePath: true,
          },
        });

      attachmentPaths =
        attachments
          .map(
            (item) =>
              item.storagePath,
          )
          .filter(Boolean);
    }

    if (kind === "customers") {
      const attachments =
        await rawPrisma.attachment.findMany({
          where: {
            order: {
              customerId: id,
            },
          },
          select: {
            storagePath: true,
          },
        });

      attachmentPaths =
        attachments
          .map(
            (item) =>
              item.storagePath,
          )
          .filter(Boolean);
    }

    await rawPrisma.$transaction(
      async (tx) => {
        if (kind === "orders") {
          await purgeOrder(
            tx,
            id,
          );
        } else if (
          kind === "users"
        ) {
          await purgeUser(
            tx,
            id,
          );
        } else if (
          kind === "customers"
        ) {
          await purgeCustomer(
            tx,
            id,
          );
        } else if (
          kind === "leads"
        ) {
          await tx.lead.delete({
            where: { id },
          });
        } else if (
          kind === "suppliers"
        ) {
          await purgeSupplier(
            tx,
            id,
          );
        } else {
          await purgeInventoryItem(
            tx,
            id,
          );
        }

        await tx.auditLog.create({
          data: {
            actorId:
              actor.id,
            actorLabel:
              actor.name,
            action:
              "ARCHIVE_PERMANENT_DELETE",
            newValue: {
              type: kind,
              targetId: id,
            },
          },
        });
      },
      {
        timeout: 30000,
      },
    );

    // Remove the physical Blob files after the DB transaction succeeds.
    for (const pathname of attachmentPaths) {
      await deleteStoredFile(
        pathname,
      );
    }

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
