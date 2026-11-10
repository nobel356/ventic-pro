import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

function clean(value: unknown, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.REPORTS_VIEW);

    const commitments = await prisma.growthCommitment.findMany({
      orderBy: [
        { status: "asc" },
        { dueAt: "asc" },
        { createdAt: "desc" },
      ],
      take: 100,
    });

    return NextResponse.json({ commitments });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.REPORTS_VIEW);
    const body = await request.json();

    const title = clean(body?.title, 240);
    if (!title) {
      return NextResponse.json(
        { error: "العنوان مطلوب." },
        { status: 400 },
      );
    }

    const saved = await prisma.growthCommitment.create({
      data: {
        title,
        sourceType: clean(body?.sourceType, 80) || "MANUAL",
        sourceKey: clean(body?.sourceKey, 180) || null,
        ownerLabel: clean(body?.ownerLabel, 120) || null,
        note: clean(body?.note, 1500) || null,
        dueAt: body?.dueAt ? new Date(body.dueAt) : null,
        status: "OPEN",
        createdByLabel: actor.name || actor.email,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "GROWTH_COMMITMENT_CREATED",
        newValue: {
          id: saved.id,
          title: saved.title,
        },
      },
    });

    return NextResponse.json({ ok: true, id: saved.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "FAILED" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.REPORTS_VIEW);
    const body = await request.json();
    const id = clean(body?.id, 120);
    const status = clean(body?.status, 30);

    if (!["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].includes(status)) {
      return NextResponse.json(
        { error: "STATUS_NOT_ALLOWED" },
        { status: 400 },
      );
    }

    const saved = await prisma.growthCommitment.update({
      where: { id },
      data: {
        status,
        ownerLabel:
          body?.ownerLabel === undefined
            ? undefined
            : clean(body.ownerLabel, 120) || null,
        note:
          body?.note === undefined
            ? undefined
            : clean(body.note, 1500) || null,
        dueAt:
          body?.dueAt === undefined
            ? undefined
            : body.dueAt
              ? new Date(body.dueAt)
              : null,
        completedAt:
          status === "DONE" ? new Date() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "GROWTH_COMMITMENT_UPDATED",
        newValue: {
          id: saved.id,
          status: saved.status,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "FAILED" },
      { status: 500 },
    );
  }
}
