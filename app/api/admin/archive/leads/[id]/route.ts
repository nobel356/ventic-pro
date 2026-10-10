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

    const lead = await rawPrisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "الـLead غير موجود." },
        { status: 404 },
      );
    }

    if (lead.archivedAt) {
      return NextResponse.json(
        { error: "الـLead موجود بالفعل في الأرشيف." },
        { status: 409 },
      );
    }

    const archivedAt = new Date();

    await rawPrisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: {
          archivedAt,
          archivedById: actor.id,
          archivedByLabel: actor.name,
          archiveReason: reason,
          archiveState: {
            status: lead.status,
            nextFollowUpAt: lead.nextFollowUpAt?.toISOString() || null,
          },
          nextFollowUpAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "ARCHIVE_LEAD",
          oldValue: {
            leadId: lead.id,
            name: lead.name,
            phone: lead.phone,
            status: lead.status,
            source: lead.source,
          },
          newValue: {
            leadId: lead.id,
            archivedAt: archivedAt.toISOString(),
            reason,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر أرشفة الـLead." },
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
    const lead = await rawPrisma.lead.findUnique({
      where: { id },
    });

    if (!lead || !lead.archivedAt) {
      return NextResponse.json(
        { error: "الـLead غير موجود في الأرشيف." },
        { status: 404 },
      );
    }

    const state =
      lead.archiveState &&
      typeof lead.archiveState === "object" &&
      !Array.isArray(lead.archiveState)
        ? (lead.archiveState as Record<string, any>)
        : {};

    const restoredAt = new Date();

    await rawPrisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: {
          archivedAt: null,
          archivedById: null,
          archivedByLabel: null,
          archiveReason: null,
          archiveState: Prisma.DbNull,
          nextFollowUpAt: state.nextFollowUpAt
            ? new Date(String(state.nextFollowUpAt))
            : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "ARCHIVE_LEAD_RESTORED",
          oldValue: {
            leadId: lead.id,
            archivedAt: lead.archivedAt!.toISOString(),
            archivedByLabel: lead.archivedByLabel,
            archiveReason: lead.archiveReason,
          },
          newValue: {
            leadId: lead.id,
            restoredAt: restoredAt.toISOString(),
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر استرجاع الـLead." },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}
