import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { syncSeoActions } from "@/lib/seo-actions";

function clean(value: unknown, max: number) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function parseStatus(value: unknown) {
  const raw = clean(value, 30);

  if (
    raw === "TODO" ||
    raw === "IN_PROGRESS" ||
    raw === "SNOOZED"
  ) {
    return raw;
  }

  return null;
}

function parseDueAt(value: unknown) {
  const raw = clean(value, 80);
  if (!raw) return null;

  const date = new Date(raw);

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

export async function GET() {
  try {
    await requirePermission(
      PERMISSIONS.REPORTS_VIEW,
    );

    const result =
      await syncSeoActions();

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message || "FAILED",
      },
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

export async function PATCH(
  request: Request,
) {
  try {
    const actor =
      await requirePermission(
        PERMISSIONS.REPORTS_VIEW,
      );

    const body =
      await request.json();

    const issueKey =
      clean(body?.issueKey, 240);

    if (!issueKey) {
      return NextResponse.json(
        {
          error:
            "ISSUE_KEY_REQUIRED",
        },
        { status: 400 },
      );
    }

    const current =
      await prisma.seoActionState.findUnique({
        where: { issueKey },
      });

    if (!current) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const status =
      body?.status === undefined
        ? current.status
        : parseStatus(body.status);

    if (!status) {
      return NextResponse.json(
        {
          error:
            "الحالة Resolved لا يتم اختيارها يدويًا. أصلح المشكلة وسيقفلها الفحص تلقائيًا.",
        },
        { status: 400 },
      );
    }

    const ownerLabel =
      body?.ownerLabel === undefined
        ? current.ownerLabel
        : clean(
            body.ownerLabel,
            120,
          ) || null;

    const note =
      body?.note === undefined
        ? current.note
        : clean(
            body.note,
            1000,
          ) || null;

    const dueAt =
      body?.dueAt === undefined
        ? current.dueAt
        : parseDueAt(body.dueAt);

    const saved =
      await prisma.seoActionState.update({
        where: { issueKey },
        data: {
          status,
          ownerLabel,
          note,
          dueAt,
        },
      });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel:
          actor.name,
        action:
          "SEO_ACTION_UPDATED",
        oldValue: {
          issueKey,
          status:
            current.status,
          ownerLabel:
            current.ownerLabel,
          dueAt:
            current.dueAt,
        },
        newValue: {
          issueKey,
          status:
            saved.status,
          ownerLabel:
            saved.ownerLabel,
          dueAt:
            saved.dueAt,
        },
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message || "FAILED",
      },
      { status: 500 },
    );
  }
}
