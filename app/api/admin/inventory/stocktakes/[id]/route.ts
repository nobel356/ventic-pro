import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/auth-v7";
import { buildInventoryNote } from "@/lib/inventory";

function serialize(stocktake: any) {
  return {
    id: stocktake.id,
    stocktakeNo: stocktake.stocktakeNo,
    status: stocktake.status,
    locationType: stocktake.locationType,
    technician: stocktake.technician,
    notes: stocktake.notes,
    approvedAt: stocktake.approvedAt,
    createdAt: stocktake.createdAt,
    lines: (stocktake.lines || []).map((line: any) => ({
      id: line.id,
      itemId: line.itemId,
      item: line.item,
      expectedQty: Number(line.expectedQty),
      actualQty: line.actualQty == null ? null : Number(line.actualQty),
      difference: line.difference == null ? null : Number(line.difference),
      note: line.note,
    })),
  };
}

async function readStocktake(id: string) {
  return prisma.stocktake.findUnique({
    where: { id },
    include: {
      technician: { select: { id: true, name: true } },
      lines: {
        include: {
          item: { select: { id: true, sku: true, nameAr: true, unit: true } },
        },
        orderBy: { item: { nameAr: "asc" } },
      },
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_VIEW);
    const { id } = await params;
    const stocktake = await readStocktake(id);

    if (!stocktake) {
      return NextResponse.json({ error: "جلسة الجرد غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(serialize(stocktake));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تحميل الجرد" },
      { status: error?.message === "UNAUTHENTICATED" ? 401 : error?.message === "FORBIDDEN" ? 403 : 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission(PERMISSIONS.STOCKTAKE_MANAGE);
    const { id } = await params;
    const body = await req.json();
    const action = String(body?.action || "save");

    const stocktake = await readStocktake(id);
    if (!stocktake) {
      return NextResponse.json({ error: "جلسة الجرد غير موجودة" }, { status: 404 });
    }
    if (stocktake.status !== "DRAFT") {
      return NextResponse.json(
        { error: "جلسة الجرد المعتمدة لا يمكن تعديلها. أنشئ جردًا جديدًا للتصحيح." },
        { status: 409 },
      );
    }

    if (action === "save") {
      const rawLines = Array.isArray(body?.lines) ? body.lines : [];
      const byId = new Map(rawLines.map((line: any) => [String(line.id), line]));

      await prisma.$transaction(async (tx) => {
        for (const line of stocktake.lines) {
          const input: any = byId.get(line.id);
          if (!input) continue;

          const actualQty = input.actualQty === "" || input.actualQty == null
            ? null
            : Number(input.actualQty);

          if (actualQty != null && (!Number.isFinite(actualQty) || actualQty < 0)) {
            throw new Error(`VALIDATION:الكمية الفعلية للصنف ${line.item.nameAr} غير صحيحة`);
          }

          const difference = actualQty == null ? null : actualQty - Number(line.expectedQty);

          await tx.stocktakeLine.update({
            where: { id: line.id },
            data: {
              actualQty,
              difference,
              note: String(input.note || "").trim() || null,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            actorLabel: actor.name,
            action: "STOCKTAKE_SAVED",
            newValue: { stocktakeId: id, stocktakeNo: stocktake.stocktakeNo },
          },
        });
      });

      const updated = await readStocktake(id);
      return NextResponse.json(serialize(updated));
    }

    if (action === "approve") {
      const rawLines = Array.isArray(body?.lines) ? body.lines : [];
      const byId = new Map(rawLines.map((line: any) => [String(line.id), line]));

      const counted = stocktake.lines.map((line) => {
        const input: any = byId.get(line.id);
        const rawActual = input?.actualQty;
        const actual =
          rawActual === "" || rawActual == null
            ? null
            : Number(rawActual);

        if (actual == null || !Number.isFinite(actual) || actual < 0) {
          throw new Error(
            `VALIDATION:أدخل الكمية الفعلية للصنف ${line.item.nameAr} قبل اعتماد الجرد`,
          );
        }

        return {
          line,
          actual,
          note: String(input?.note ?? line.note ?? "").trim() || null,
          difference: actual - Number(line.expectedQty),
        };
      });

      await prisma.$transaction(
        async (tx) => {
          for (const row of counted) {
            const expected = Number(row.line.expectedQty);

            await tx.stocktakeLine.update({
              where: { id: row.line.id },
              data: {
                actualQty: row.actual,
                difference: row.difference,
                note: row.note,
              },
            });

            if (Math.abs(row.difference) < 0.000001) continue;

            if (stocktake.locationType === "COMPANY") {
              await tx.inventoryItem.update({
                where: { id: row.line.itemId },
                data: { quantity: row.actual },
              });

              await tx.inventoryMovement.create({
                data: {
                  itemId: row.line.itemId,
                  type: "ADJUSTMENT",
                  quantity: row.difference,
                  stocktakeId: stocktake.id,
                  note: buildInventoryNote(
                    "COMPANY_ADJUST",
                    `اعتماد الجرد ${stocktake.stocktakeNo}: ${expected} ← ${row.actual}`,
                  ),
                },
              });
            } else {
              await tx.inventoryMovement.create({
                data: {
                  itemId: row.line.itemId,
                  technicianId: stocktake.technicianId,
                  type: "ADJUSTMENT",
                  quantity: row.difference,
                  stocktakeId: stocktake.id,
                  note: buildInventoryNote(
                    "TECH_ADJUST",
                    `اعتماد جرد عهدة ${stocktake.stocktakeNo}: ${expected} ← ${row.actual}`,
                  ),
                },
              });
            }
          }

          await tx.stocktake.update({
            where: { id },
            data: {
              status: "APPROVED",
              approvedById: actor.id,
              approvedAt: new Date(),
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              actorLabel: actor.name,
              action: "STOCKTAKE_APPROVED",
              newValue: {
                stocktakeId: id,
                stocktakeNo: stocktake.stocktakeNo,
                locationType: stocktake.locationType,
                technicianId: stocktake.technicianId,
                countedItems: counted.length,
                differenceCount: counted.filter(
                  (row) => Math.abs(row.difference) > 0.000001,
                ).length,
              },
            },
          });
        },
        { isolationLevel: "Serializable" },
      );

      const updated = await readStocktake(id);
      return NextResponse.json(serialize(updated));
    }

    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (error: any) {
    const message = String(error?.message || "");
    return NextResponse.json(
      {
        error: message.startsWith("VALIDATION:")
          ? message.slice("VALIDATION:".length)
          : message || "تعذر تحديث الجرد",
      },
      {
        status:
          message.startsWith("VALIDATION:")
            ? 400
            : message === "UNAUTHENTICATED"
              ? 401
              : message === "FORBIDDEN"
                ? 403
                : 500,
      },
    );
  }
}
