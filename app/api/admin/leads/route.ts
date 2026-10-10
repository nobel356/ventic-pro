import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

const statuses = new Set([
  "STARTED",
  "CONTACTED",
  "CONVERTED",
  "ABANDONED",
]);

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.LEADS_MANAGE);

    const leads = await prisma.lead.findMany({
      where: {
        archivedAt: null,
        status: {
          in: ["STARTED", "CONTACTED", "ABANDONED"],
        },
      },
      orderBy: { lastActivityAt: "desc" },
      take: 300,
    });

    return NextResponse.json(
      leads.map((lead) => ({
        id: lead.id,
        phone: lead.phone,
        name: lead.name,
        source: lead.source,
        status: lead.status,
        currentStep: lead.currentStep,
        consentToFollowUp: lead.consentToFollowUp,
        followUpNote: lead.followUpNote,
        nextFollowUpAt: lead.nextFollowUpAt,
        contactedAt: lead.contactedAt,
        lastActivityAt: lead.lastActivityAt,
        createdAt: lead.createdAt,
      })),
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تحميل المتابعات" },
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

export async function PATCH(req: Request) {
  try {
    const actor = await requirePermission(
      PERMISSIONS.LEADS_MANAGE,
    );
    const body = await req.json();
    const id = String(body?.id || "");
    const status = String(body?.status || "");
    const followUpNote = String(body?.followUpNote || "").trim() || null;
    const nextFollowUpAt = body?.nextFollowUpAt
      ? new Date(String(body.nextFollowUpAt))
      : null;

    if (!id || !statuses.has(status)) {
      return NextResponse.json(
        { error: "بيانات المتابعة غير صحيحة" },
        { status: 400 },
      );
    }

    if (
      nextFollowUpAt &&
      Number.isNaN(nextFollowUpAt.getTime())
    ) {
      return NextResponse.json(
        { error: "موعد المتابعة غير صحيح" },
        { status: 400 },
      );
    }

    const current = await prisma.lead.findFirst({
      where: {
        id,
        archivedAt: null,
      },
    });

    if (!current) {
      return NextResponse.json(
        { error: "المتابعة غير موجودة" },
        { status: 404 },
      );
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        status: status as any,
        followUpNote,
        nextFollowUpAt,
        contactedAt:
          status === "CONTACTED" && !current.contactedAt
            ? new Date()
            : current.contactedAt,
        lastActivityAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "LEAD_FOLLOWUP_UPDATED",
        oldValue: {
          leadId: current.id,
          status: current.status,
          followUpNote: current.followUpNote,
          nextFollowUpAt: current.nextFollowUpAt,
        },
        newValue: {
          leadId: updated.id,
          status: updated.status,
          followUpNote: updated.followUpNote,
          nextFollowUpAt: updated.nextFollowUpAt,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تحديث المتابعة" },
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
