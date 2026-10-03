import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { audit } from "@/lib/audit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission(PERMISSIONS.ASSIGN_TECH);
    const { id } = await params;

    const slot = await prisma.technicianSlot.findUnique({
      where: { id },
      include: {
        technician: {
          select: { id: true, name: true },
        },
      },
    });

    if (!slot) {
      return NextResponse.json(
        { error: "الموعد غير موجود" },
        { status: 404 },
      );
    }

    await prisma.technicianSlot.delete({
      where: { id },
    });

    await audit({
      orderId: slot.orderId || undefined,
      actorId: actor.id,
      actorLabel: actor.name,
      action: "TECHNICIAN_SLOT_DELETED",
      oldValue: {
        slotId: slot.id,
        technicianId: slot.technicianId,
        technicianName: slot.technician.name,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "تعذر حذف الموعد" },
      {
        status:
          error.message === "UNAUTHENTICATED"
            ? 401
            : error.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
