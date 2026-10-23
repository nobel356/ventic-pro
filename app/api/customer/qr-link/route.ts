import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/customer-auth";
import {
  createQrAccessToken,
  isAllowedQrTarget,
} from "@/lib/qr-access-token";

function cleanPath(
  value: string | null,
) {
  return String(
    value || "",
  )
    .trim()
    .slice(
      0,
      500,
    );
}

async function authorized(
  customerId: string,
  path: string,
) {
  const parts =
    path
      .split("/")
      .filter(Boolean);

  if (
    parts.length < 4
  ) {
    return false;
  }

  if (
    path.startsWith(
      "/customer/account/invoices/",
    )
  ) {
    const invoiceId =
      decodeURIComponent(
        parts[
          parts.length - 1
        ],
      );

    const invoice =
      await prisma.invoice.findFirst(
        {
          where: {
            id:
              invoiceId,
            order: {
              customerId,
            },
          },
          select: {
            id: true,
          },
        },
      );

    return Boolean(
      invoice,
    );
  }

  if (
    path.startsWith(
      "/customer/account/warranty/",
    ) ||
    path.startsWith(
      "/customer/account/orders/",
    )
  ) {
    const orderId =
      decodeURIComponent(
        parts[
          parts.length - 1
        ],
      );

    const order =
      await prisma.order.findFirst(
        {
          where: {
            id:
              orderId,
            customerId,
            archivedAt:
              null,
          },
          select: {
            id: true,
          },
        },
      );

    return Boolean(
      order,
    );
  }

  return false;
}

export async function GET(
  req: Request,
) {
  const customer =
    await currentCustomer();

  if (!customer) {
    return NextResponse.json(
      {
        error:
          "UNAUTHENTICATED",
      },
      {
        status: 401,
      },
    );
  }

  const url =
    new URL(
      req.url,
    );

  const path =
    cleanPath(
      url.searchParams.get(
        "path",
      ),
    );

  if (
    !isAllowedQrTarget(
      path,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "INVALID_TARGET",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !(await authorized(
      customer.id,
      path,
    ))
  ) {
    return NextResponse.json(
      {
        error:
          "NOT_FOUND",
      },
      {
        status: 404,
      },
    );
  }

  const token =
    createQrAccessToken(
      path,
    );

  const origin =
    new URL(
      req.url,
    ).origin;

  return NextResponse.json({
    url: `${origin}/q/${encodeURIComponent(
      token,
    )}`,
  });
}
