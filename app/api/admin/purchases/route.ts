import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, can, requirePermission } from "@/lib/auth-v7";
import { buildInventoryNote } from "@/lib/inventory";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

type PurchaseLineInput = {
  itemId: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
};

export async function GET() {
  try {
    const actor = await requirePermission(PERMISSIONS.INVENTORY_VIEW);
    const [suppliers, items, receipts] = await Promise.all([
      prisma.supplier.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
      }),
      prisma.inventoryItem.findMany({
        where: { active: true },
        orderBy: { nameAr: "asc" },
      }),
      prisma.purchaseReceipt.findMany({
        include: {
          supplier: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true } },
          items: {
            include: {
              item: { select: { id: true, sku: true, nameAr: true, unit: true } },
            },
          },
        },
        orderBy: { receivedAt: "desc" },
        take: 100,
      }),
    ]);

    return NextResponse.json({
      suppliers,
      items: items.map((item) => ({
        id: item.id,
        sku: item.sku,
        nameAr: item.nameAr,
        unit: item.unit,
        quantity: Number(item.quantity),
        lastUnitCost: Number(item.lastUnitCost),
        averageUnitCost: Number(item.averageUnitCost),
      })),
      receipts: receipts.map((receipt) => ({
        id: receipt.id,
        receiptNo: receipt.receiptNo,
        supplierInvoiceNo: receipt.supplierInvoiceNo,
        status: receipt.status,
        total: Number(receipt.total),
        receivedAt: receipt.receivedAt,
        notes: receipt.notes,
        supplier: receipt.supplier,
        receivedBy: receipt.receivedBy,
        items: receipt.items.map((line) => ({
          id: line.id,
          item: line.item,
          quantity: Number(line.quantity),
          unitCost: Number(line.unitCost),
          lineTotal: Number(line.lineTotal),
        })),
      })),
      permissions: {
        canManageSuppliers: can(
          actor.role,
          PERMISSIONS.SUPPLIERS_MANAGE,
          actor.permissions,
        ),
        canReceive: can(
          actor.role,
          PERMISSIONS.PURCHASES_MANAGE,
          actor.permissions,
        ),
        canViewCost: can(
          actor.role,
          PERMISSIONS.INVENTORY_COST_VIEW,
          actor.permissions,
        ),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تحميل المشتريات" },
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body?.action || "receive");

    if (action === "supplier" || action === "supplier-update") {
      const actor = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);
      const name = String(body?.name || "").trim();

      if (!name) {
        return NextResponse.json({ error: "اسم المورد مطلوب" }, { status: 400 });
      }

      if (action === "supplier-update") {
        const supplierId = String(body?.supplierId || "");
        const oldSupplier = await prisma.supplier.findUnique({
          where: { id: supplierId },
        });

        if (!oldSupplier) {
          return NextResponse.json({ error: "المورد غير موجود" }, { status: 404 });
        }

        const supplier = await prisma.supplier.update({
          where: { id: supplierId },
          data: {
            name,
            phone: String(body?.phone || "").trim() || null,
            address: String(body?.address || "").trim() || null,
            taxNumber: String(body?.taxNumber || "").trim() || null,
            notes: String(body?.notes || "").trim() || null,
            active: body?.active === undefined ? oldSupplier.active : Boolean(body.active),
          },
        });

        await prisma.auditLog.create({
          data: {
            actorId: actor.id,
            actorLabel: actor.name,
            action: "SUPPLIER_UPDATED",
            oldValue: {
              supplierId: oldSupplier.id,
              name: oldSupplier.name,
              phone: oldSupplier.phone,
              address: oldSupplier.address,
              taxNumber: oldSupplier.taxNumber,
              active: oldSupplier.active,
            },
            newValue: {
              supplierId: supplier.id,
              name: supplier.name,
              phone: supplier.phone,
              address: supplier.address,
              taxNumber: supplier.taxNumber,
              active: supplier.active,
            },
          },
        });

        return NextResponse.json(supplier);
      }

      const supplier = await prisma.supplier.create({
        data: {
          name,
          phone: String(body?.phone || "").trim() || null,
          address: String(body?.address || "").trim() || null,
          taxNumber: String(body?.taxNumber || "").trim() || null,
          notes: String(body?.notes || "").trim() || null,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "SUPPLIER_CREATED",
          newValue: {
            supplierId: supplier.id,
            name: supplier.name,
            phone: supplier.phone,
          },
        },
      });

      return NextResponse.json(supplier, { status: 201 });
    }

    const actor = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
    const supplierId = String(body?.supplierId || "");
    const supplierInvoiceNo = String(body?.supplierInvoiceNo || "").trim() || null;
    const notes = String(body?.notes || "").trim() || null;
    const rawItems: unknown[] = Array.isArray(body?.items)
      ? body.items
      : [];

    if (!supplierId || rawItems.length === 0) {
      return NextResponse.json(
        { error: "اختر المورد وأضف بند توريد واحد على الأقل" },
        { status: 400 },
      );
    }

    const lines: PurchaseLineInput[] = rawItems.map(
      (rawLine: unknown, index: number): PurchaseLineInput => {
        const line =
          rawLine && typeof rawLine === "object"
            ? (rawLine as Record<string, unknown>)
            : {};

        const itemId = String(line.itemId || "");
        const quantity = Number(line.quantity || 0);
        const unitCost = Number(line.unitCost || 0);

        if (!itemId || !Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(`VALIDATION:كمية البند ${index + 1} غير صحيحة`);
        }

        if (!Number.isFinite(unitCost) || unitCost < 0) {
          throw new Error(`VALIDATION:تكلفة البند ${index + 1} غير صحيحة`);
        }

        return {
          itemId,
          quantity,
          unitCost,
          lineTotal: roundMoney(quantity * unitCost),
        };
      },
    );

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, active: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "المورد غير موجود أو موقوف" }, { status: 404 });
    }

    const total = roundMoney(
      lines.reduce(
        (sum: number, line: PurchaseLineInput) => sum + line.lineTotal,
        0,
      ),
    );
    const receiptNo = `PUR-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

    const result = await prisma.$transaction(
      async (tx) => {
        const receipt = await tx.purchaseReceipt.create({
          data: {
            receiptNo,
            supplierId,
            supplierInvoiceNo,
            total,
            notes,
            receivedById: actor.id,
          },
        });

        for (const line of lines) {
          const item = await tx.inventoryItem.findUnique({
            where: { id: line.itemId },
          });

          if (!item || !item.active) {
            throw new Error("ITEM_NOT_FOUND");
          }

          const oldQty = Number(item.quantity);
          const oldAverage = Number(item.averageUnitCost || 0);
          const newQty = oldQty + line.quantity;
          const newAverage =
            newQty > 0
              ? roundMoney(
                  (oldQty * oldAverage + line.quantity * line.unitCost) / newQty,
                )
              : 0;

          await tx.purchaseReceiptItem.create({
            data: {
              purchaseReceiptId: receipt.id,
              itemId: line.itemId,
              quantity: line.quantity,
              unitCost: line.unitCost,
              lineTotal: line.lineTotal,
            },
          });

          await tx.inventoryItem.update({
            where: { id: line.itemId },
            data: {
              quantity: newQty,
              lastUnitCost: line.unitCost,
              averageUnitCost: newAverage,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              itemId: line.itemId,
              type: "IN",
              quantity: line.quantity,
              purchaseReceiptId: receipt.id,
              note: buildInventoryNote(
                "COMPANY_IN",
                `توريد ${receiptNo} من ${supplier.name}${
                  supplierInvoiceNo ? ` — فاتورة مورد ${supplierInvoiceNo}` : ""
                }`,
              ),
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            actorLabel: actor.name,
            action: "PURCHASE_RECEIVED",
            newValue: {
              purchaseReceiptId: receipt.id,
              receiptNo,
              supplierId,
              supplierName: supplier.name,
              supplierInvoiceNo,
              itemCount: lines.length,
              total,
            },
          },
        });

        return receipt;
      },
      { isolationLevel: "Serializable" },
    );

    return NextResponse.json({ id: result.id, receiptNo, total }, { status: 201 });
  } catch (error: any) {
    const message = String(error?.message || "");

    if (message.startsWith("VALIDATION:")) {
      return NextResponse.json(
        { error: message.slice("VALIDATION:".length) },
        { status: 400 },
      );
    }

    if (message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "أحد أصناف التوريد غير موجود أو موقوف" }, { status: 404 });
    }

    return NextResponse.json(
      { error: message || "تعذر تسجيل التوريد" },
      {
        status:
          message === "UNAUTHENTICATED"
            ? 401
            : message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
