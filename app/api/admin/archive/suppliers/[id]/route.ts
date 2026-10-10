import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  requireArchiveActor,
  requireVaultUnlocked,
} from "@/lib/archive-vault";
import { PERMISSIONS } from "@/lib/permission-config";
import { rawPrisma } from "@/lib/prisma";

function reasonFrom(body: any) {
  return String(body?.reason || "").trim();
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireArchiveActor(
      PERMISSIONS.ARCHIVE_MANAGE,
    );
    await requireVaultUnlocked(actor.id);

    const { id } = await params;
    const body = await req.json();
    const reason = reasonFrom(body);

    if (reason.length < 3) {
      return NextResponse.json(
        { error: "اكتب سبب الأرشفة (3 أحرف على الأقل)." },
        { status: 400 },
      );
    }

    const supplier = await rawPrisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "المورد غير موجود." },
        { status: 404 },
      );
    }

    if (supplier.archivedAt) {
      return NextResponse.json(
        { error: "المورد موجود بالفعل في الأرشيف." },
        { status: 409 },
      );
    }

    const archivedAt = new Date();

    await rawPrisma.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id },
        data: {
          archivedAt,
          archivedById: actor.id,
          archivedByLabel: actor.name,
          archiveReason: reason,
          archiveState: {
            active: supplier.active,
          },
          active: false,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "ARCHIVE_SUPPLIER",
          oldValue: {
            supplierId: supplier.id,
            name: supplier.name,
            phone: supplier.phone,
            active: supplier.active,
            purchaseCount: supplier._count.purchases,
          },
          newValue: {
            supplierId: supplier.id,
            archivedAt: archivedAt.toISOString(),
            reason,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر أرشفة المورد." },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireArchiveActor(
      PERMISSIONS.ARCHIVE_RESTORE,
    );
    await requireVaultUnlocked(actor.id);

    const { id } = await params;
    const supplier = await rawPrisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier || !supplier.archivedAt) {
      return NextResponse.json(
        { error: "المورد غير موجود في الأرشيف." },
        { status: 404 },
      );
    }

    const state =
      supplier.archiveState &&
      typeof supplier.archiveState === "object" &&
      !Array.isArray(supplier.archiveState)
        ? (supplier.archiveState as Record<string, any>)
        : {};

    const restoreActive = state.active !== false;
    const restoredAt = new Date();

    await rawPrisma.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id },
        data: {
          archivedAt: null,
          archivedById: null,
          archivedByLabel: null,
          archiveReason: null,
          archiveState: Prisma.DbNull,
          active: restoreActive,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "ARCHIVE_SUPPLIER_RESTORED",
          oldValue: {
            supplierId: supplier.id,
            archivedAt: supplier.archivedAt!.toISOString(),
            archivedByLabel: supplier.archivedByLabel,
            archiveReason: supplier.archiveReason,
          },
          newValue: {
            supplierId: supplier.id,
            restoredAt: restoredAt.toISOString(),
            active: restoreActive,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر استرجاع المورد." },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}
