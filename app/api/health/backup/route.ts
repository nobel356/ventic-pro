import { NextResponse } from "next/server";
import { rawPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AGE_HOURS = 30;

export async function GET() {
  const latest = await rawPrisma.auditLog
    .findFirst({
      where: {
        action: "DB_BACKUP_VERIFIED",
        actorLabel: "system:db-backup",
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    .catch(() => null);

  if (!latest) {
    return NextResponse.json(
      {
        ok: false,
        backup: "missing",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  const ageMs =
    Date.now() - latest.createdAt.getTime();

  const ageHours =
    Math.round(
      (ageMs / (60 * 60 * 1000)) * 10,
    ) / 10;

  const ok = ageHours <= MAX_AGE_HOURS;

  return NextResponse.json(
    {
      ok,
      backup: ok ? "fresh" : "stale",
      lastVerifiedAt: latest.createdAt.toISOString(),
      ageHours,
      maxAgeHours: MAX_AGE_HOURS,
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
