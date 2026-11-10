import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import {
  ensureGrowthTargets,
  growthMetricDefinitions,
} from "@/lib/growth-metrics";

const allowed = new Set(
  growthMetricDefinitions.map((item) => item.key),
);

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.REPORTS_VIEW);
    await ensureGrowthTargets();

    const targets = await prisma.growthTarget.findMany({
      orderBy: { label: "asc" },
    });

    return NextResponse.json({ targets });
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

    const key = String(body?.key || "").trim();
    const targetValue = Number(body?.targetValue);

    if (!allowed.has(key as any)) {
      return NextResponse.json(
        { error: "TARGET_NOT_ALLOWED" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(targetValue) || targetValue < 0 || targetValue > 100) {
      return NextResponse.json(
        { error: "القيمة لازم تكون بين 0 و100." },
        { status: 400 },
      );
    }

    const old = await prisma.growthTarget.findUnique({
      where: { key },
    });

    const saved = await prisma.growthTarget.upsert({
      where: { key },
      update: {
        targetValue,
        updatedByLabel: actor.name || actor.email,
      },
      create: {
        key,
        label:
          growthMetricDefinitions.find((item) => item.key === key)?.label ||
          key,
        targetValue,
        comparator: "GTE",
        active: true,
        updatedByLabel: actor.name || actor.email,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "GROWTH_TARGET_UPDATED",
        oldValue: old
          ? { key, targetValue: old.targetValue }
          : undefined,
        newValue: { key, targetValue: saved.targetValue },
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
