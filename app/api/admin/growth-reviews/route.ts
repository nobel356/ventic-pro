import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { buildGrowthCommandCenter } from "@/lib/growth-command";
import { buildGrowthFunnel } from "@/lib/growth-funnel";

function mondayStart(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function clean(value: unknown, max = 4000) {
  return String(value || "").trim().slice(0, max);
}

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.REPORTS_VIEW);

    const reviews = await prisma.growthReview.findMany({
      orderBy: { weekStart: "desc" },
      take: 12,
    });

    return NextResponse.json({ reviews });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "FAILED" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const actor = await requirePermission(PERMISSIONS.REPORTS_VIEW);
    const weekStart = mondayStart();

    const [command, funnel] = await Promise.all([
      buildGrowthCommandCenter(),
      buildGrowthFunnel(),
    ]);

    const snapshot = {
      generatedAt: new Date().toISOString(),
      snapshot: command.snapshot,
      quality: command.quality,
      growth: {
        dataReady: command.growth.dataReady,
        highCount: command.growth.highCount,
      },
      cro: command.cro,
      topActions: command.actions.slice(0, 5),
      funnel: funnel.rows,
    };

    const saved = await prisma.growthReview.upsert({
      where: { weekStart },
      update: {
        snapshot,
        refreshedAt: new Date(),
        refreshedByLabel: actor.name || actor.email,
      },
      create: {
        weekStart,
        snapshot,
        createdByLabel: actor.name || actor.email,
        refreshedAt: new Date(),
        refreshedByLabel: actor.name || actor.email,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "GROWTH_REVIEW_SNAPSHOT",
        newValue: {
          id: saved.id,
          weekStart: saved.weekStart,
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

    const saved = await prisma.growthReview.update({
      where: { id },
      data: {
        notes: clean(body?.notes, 6000) || null,
        decisions: clean(body?.decisions, 6000) || null,
        refreshedByLabel: actor.name || actor.email,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "GROWTH_REVIEW_NOTES_UPDATED",
        newValue: {
          id: saved.id,
          weekStart: saved.weekStart,
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
