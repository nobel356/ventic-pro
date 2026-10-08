import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import {
  ORDER_COST_RECORDED,
  ORDER_COST_VOIDED,
  materializeOrderCosts,
  type OrderCostCategory,
} from "@/lib/order-costs";

function clean(
  value: unknown,
  max = 500,
) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

async function authorizedUser() {
  const user =
    await currentUser();

  if (!user) {
    return {
      user: null,
      response:
        NextResponse.json(
          { error: "غير مصرح" },
          { status: 401 },
        ),
    };
  }

  if (
    !can(
      user.role,
      PERMISSIONS.PAYMENTS_MANAGE,
      user.permissions,
    )
  ) {
    return {
      user: null,
      response:
        NextResponse.json(
          { error: "غير مسموح" },
          { status: 403 },
        ),
    };
  }

  return {
    user,
    response: null,
  };
}

async function costLogs(
  orderIds?: string[],
) {
  return prisma.auditLog.findMany({
    where: {
      ...(orderIds?.length
        ? {
            orderId: {
              in: orderIds,
            },
          }
        : {}),
      action: {
        in: [
          ORDER_COST_RECORDED,
          ORDER_COST_VOIDED,
        ],
      },
    },
    select: {
      id: true,
      orderId: true,
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

export async function POST(
  req: Request,
) {
  const auth =
    await authorizedUser();

  if (
    auth.response ||
    !auth.user
  ) {
    return auth.response!;
  }

  const body =
    await req.json();

  const orderId =
    clean(body?.orderId, 80);
  const category =
    clean(
      body?.category,
      30,
    ) as OrderCostCategory;
  const amount =
    Number(body?.amount);
  const note =
    clean(body?.note, 500);
  const occurredAtText =
    clean(
      body?.occurredAt,
      30,
    );

  const occurredAt =
    /^\d{4}-\d{2}-\d{2}$/.test(
      occurredAtText,
    )
      ? new Date(
          `${occurredAtText}T12:00:00.000Z`,
        )
      : new Date(
          occurredAtText,
        );

  if (!orderId) {
    return NextResponse.json(
      {
        error:
          "اختر الطلب.",
      },
      { status: 400 },
    );
  }

  if (
    ![
      "LABOR",
      "TRANSPORT",
      "OTHER",
    ].includes(category)
  ) {
    return NextResponse.json(
      {
        error:
          "نوع التكلفة غير صحيح.",
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
      occurredAt.getTime(),
    )
  ) {
    return NextResponse.json(
      {
        error:
          "تاريخ التكلفة غير صحيح.",
      },
      { status: 400 },
    );
  }

  const order =
    await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        orderNo: true,
      },
    });

  if (!order) {
    return NextResponse.json(
      {
        error:
          "الطلب غير موجود.",
      },
      { status: 404 },
    );
  }

  const created =
    await prisma.auditLog.create({
      data: {
        orderId:
          order.id,
        actorId:
          auth.user.id,
        actorLabel:
          auth.user.name,
        action:
          ORDER_COST_RECORDED,
        newValue: {
          category,
          amount,
          occurredAt:
            occurredAt.toISOString(),
          note:
            note || null,
          currency: "EGP",
          orderNo:
            order.orderNo,
        },
      },
      select: {
        id: true,
      },
    });

  console.info(
    "[ORDER_COST] recorded",
    {
      costAuditId:
        created.id,
      orderId:
        order.id,
      category,
      amount,
      occurredAt:
        occurredAt
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
    await authorizedUser();

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
    await costLogs();
  const active =
    materializeOrderCosts(
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
      orderId:
        target.orderId,
      actorId:
        auth.user.id,
      actorLabel:
        auth.user.name,
      action:
        ORDER_COST_VOIDED,
      newValue: {
        costAuditId:
          target.id,
        category:
          target.category,
        amount:
          target.amount,
        occurredAt:
          target.occurredAt.toISOString(),
      },
    },
  });

  console.info(
    "[ORDER_COST] voided",
    {
      costAuditId:
        target.id,
      orderId:
        target.orderId,
      actorId:
        auth.user.id,
    },
  );

  return NextResponse.json({
    ok: true,
  });
}
