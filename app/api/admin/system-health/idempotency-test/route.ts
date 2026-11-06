import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-v7";
import { prisma } from "@/lib/prisma";
import {
  claimIdempotency,
  completeIdempotency,
  hashIdempotencyPayload,
} from "@/lib/request-idempotency";

export async function POST() {
  const user =
    await currentUser();

  if (!user) {
    return NextResponse.json(
      { error: "غير مصرح" },
      { status: 401 },
    );
  }

  if (
    user.role !==
    "SUPER_ADMIN"
  ) {
    return NextResponse.json(
      { error: "غير مسموح" },
      { status: 403 },
    );
  }

  const scope =
    "QA_PUBLIC_ORDER";
  const key =
    `qa-${randomUUID()}`;
  const payload = {
    customer: {
      phone:
        "01000000000",
    },
    marker:
      randomUUID(),
  };
  const requestHash =
    hashIdempotencyPayload(
      payload,
    );

  try {
    const claims =
      await Promise.all(
        Array.from(
          { length: 8 },
          () =>
            claimIdempotency({
              scope,
              key,
              requestHash,
              waitMs: 350,
            }),
        ),
      );

    const owners =
      claims.filter(
        (item) =>
          item.kind ===
          "OWNER",
      );

    const singleOwner =
      owners.length === 1;

    if (!singleOwner) {
      return NextResponse.json(
        {
          ok: false,
          checks: {
            singleOwner,
            owners:
              owners.length,
          },
        },
        { status: 500 },
      );
    }

    const response = {
      orderId:
        "qa-order-id",
      orderNo:
        "VP-QA-IDEMPOTENCY",
      estimatedTotal:
        123,
      referralApplied:
        null,
      referralDiscount:
        0,
    };

    await completeIdempotency({
      id:
        owners[0].id,
      response,
      resourceId:
        "qa-order-id",
    });

    const replay =
      await claimIdempotency({
        scope,
        key,
        requestHash,
      });

    const replayPassed =
      replay.kind ===
        "REPLAY" &&
      replay.response
        ?.orderId ===
        response.orderId &&
      replay.response
        ?.orderNo ===
        response.orderNo;

    const conflict =
      await claimIdempotency({
        scope,
        key,
        requestHash:
          hashIdempotencyPayload({
            ...payload,
            marker:
              "different-payload",
          }),
      });

    const conflictPassed =
      conflict.kind ===
      "CONFLICT";

    const createdRows =
      await prisma.idempotencyRequest.count({
        where: {
          scope,
          key,
        },
      });

    const oneDurableRecord =
      createdRows === 1;

    const ok =
      singleOwner &&
      replayPassed &&
      conflictPassed &&
      oneDurableRecord;

    return NextResponse.json(
      {
        ok,
        checks: {
          concurrentAttempts:
            8,
          owners:
            owners.length,
          replay:
            replayPassed,
          payloadConflict:
            conflictPassed,
          durableRows:
            createdRows,
        },
      },
      {
        status: ok
          ? 200
          : 500,
      },
    );
  } finally {
    await prisma.idempotencyRequest.deleteMany({
      where: {
        scope,
        key,
      },
    });
  }
}
