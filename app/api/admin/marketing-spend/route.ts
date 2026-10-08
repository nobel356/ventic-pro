import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-v7";
import {
  MARKETING_SPEND_RECORDED,
  MARKETING_SPEND_VOIDED,
  materializeMarketingSpends,
} from "@/lib/marketing-spend";
import { safeDiagnostic } from "@/lib/safe-diagnostics";

function clean(
  value: unknown,
  max = 160,
) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

async function requireSuperAdmin() {
  const user =
    await currentUser();

  if (!user) {
    return {
      user: null,
      response:
        NextResponse.json(
          {
            error:
              "غير مصرح",
          },
          { status: 401 },
        ),
    };
  }

  if (
    user.role !==
    "SUPER_ADMIN"
  ) {
    return {
      user: null,
      response:
        NextResponse.json(
          {
            error:
              "غير مسموح",
          },
          { status: 403 },
        ),
    };
  }

  return {
    user,
    response: null,
  };
}

async function spendLogs() {
  return prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          MARKETING_SPEND_RECORDED,
          MARKETING_SPEND_VOIDED,
        ],
      },
    },
    select: {
      id: true,
      action: true,
      actorLabel: true,
      newValue: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function GET() {
  const auth =
    await requireSuperAdmin();

  if (auth.response) {
    return auth.response;
  }

  const spends =
    materializeMarketingSpends(
      await spendLogs(),
    );

  return NextResponse.json(
    spends.map((item) => ({
      ...item,
      spentAt:
        item.spentAt.toISOString(),
      createdAt:
        item.createdAt.toISOString(),
    })),
  );
}

export async function POST(
  req: Request,
) {
  const auth =
    await requireSuperAdmin();

  if (
    auth.response ||
    !auth.user
  ) {
    return auth.response!;
  }

  const body =
    await req.json();
  const source =
    clean(body?.source, 100);
  const campaign =
    clean(
      body?.campaign,
      160,
    );
  const note =
    clean(body?.note, 500);
  const amount =
    Number(body?.amount);
  const dateText =
    clean(body?.spentAt, 20);

  const spentAt =
    /^\d{4}-\d{2}-\d{2}$/.test(
      dateText,
    )
      ? new Date(
          `${dateText}T12:00:00.000Z`,
        )
      : new Date(dateText);

  if (!source) {
    return NextResponse.json(
      {
        error:
          "اكتب مصدر الإعلان.",
      },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(
      amount,
    ) ||
    amount <= 0 ||
    amount >
      100_000_000
  ) {
    return NextResponse.json(
      {
        error:
          "قيمة التكلفة غير صحيحة.",
      },
      { status: 400 },
    );
  }

  if (
    Number.isNaN(
      spentAt.getTime(),
    )
  ) {
    return NextResponse.json(
      {
        error:
          "تاريخ الصرف غير صحيح.",
      },
      { status: 400 },
    );
  }

  const created =
    await prisma.auditLog.create({
      data: {
        actorId:
          auth.user.id,
        actorLabel:
          auth.user.name,
        action:
          MARKETING_SPEND_RECORDED,
        newValue: {
          source,
          campaign:
            campaign || null,
          amount,
          spentAt:
            spentAt.toISOString(),
          note:
            note || null,
          currency: "EGP",
        },
      },
      select: {
        id: true,
      },
    });

  safeDiagnostic(
    "marketing_spend.recorded",
    {
      spendAuditId:
        created.id,
      source,
      campaignPresent:
        Boolean(campaign),
      amount,
      spentAt:
        spentAt
          .toISOString()
          .slice(0, 10),
      actorId:
        auth.user.id,
    },
  );

  return NextResponse.json(
    {
      ok: true,
      id: created.id,
    },
    { status: 201 },
  );
}

export async function DELETE(
  req: Request,
) {
  const auth =
    await requireSuperAdmin();

  if (
    auth.response ||
    !auth.user
  ) {
    return auth.response!;
  }

  const body =
    await req.json();
  const id =
    clean(body?.id, 80);

  if (!id) {
    return NextResponse.json(
      {
        error:
          "السجل غير محدد.",
      },
      { status: 400 },
    );
  }

  const logs =
    await spendLogs();
  const active =
    materializeMarketingSpends(
      logs,
    );
  const target =
    active.find(
      (item) =>
        item.id === id,
    );

  if (!target) {
    return NextResponse.json(
      {
        error:
          "سجل التكلفة غير موجود أو تم إلغاؤه.",
      },
      { status: 404 },
    );
  }

  await prisma.auditLog.create({
    data: {
      actorId:
        auth.user.id,
      actorLabel:
        auth.user.name,
      action:
        MARKETING_SPEND_VOIDED,
      newValue: {
        spendAuditId:
          target.id,
        source:
          target.source,
        campaign:
          target.campaign ||
          null,
        amount:
          target.amount,
        spentAt:
          target.spentAt.toISOString(),
      },
    },
  });

  safeDiagnostic(
    "marketing_spend.voided",
    {
      spendAuditId:
        target.id,
      actorId:
        auth.user.id,
    },
  );

  return NextResponse.json({
    ok: true,
  });
}
