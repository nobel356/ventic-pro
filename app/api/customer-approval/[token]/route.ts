import { AdminNotificationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/admin-notifications";
import {
  calculateOrderFinancials,
  syncOrderInvoice,
} from "@/lib/order-financials";
import {
  approvalLinkExpired,
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

const APPROVAL_MAX_AGE_MS =
  7 * 24 * 60 * 60 * 1000;

function moneyNumber(value: unknown) {
  return Number(value || 0);
}

function roundMoney(value: number) {
  return (
    Math.round(
      (value + Number.EPSILON) *
        100,
    ) / 100
  );
}

function expiredResponse() {
  return NextResponse.json(
    {
      error:
        "انتهت صلاحية رابط الموافقة. تواصل مع Ventic Pro لإرسال رابط جديد.",
      expired: true,
    },
    {
      status: 410,
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}

function publicHeaders() {
  return {
    "Cache-Control":
      "no-store, max-age=0",
  };
}

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      token: string;
    }>;
  },
) {
  const limited = rateLimit(
    `approval-read:${clientIp(
      req,
    )}`,
    {
      limit: 120,
      windowMs:
        15 * 60 * 1000,
    },
  );

  if (!limited.allowed) {
    return NextResponse.json(
      {
        error:
          "تم تجاوز عدد المحاولات مؤقتًا.",
      },
      {
        status: 429,
        headers:
          rateLimitHeaders(
            limited,
          ),
      },
    );
  }

  const { token } = await params;

  if (
    !token ||
    token.length < 32
  ) {
    return NextResponse.json(
      {
        error:
          "الرابط غير صالح",
      },
      {
        status: 404,
        headers:
          publicHeaders(),
      },
    );
  }

  const estimate =
    await prisma.venticEstimate.findUnique({
      where: {
        customerToken:
          token,
      },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        order: {
          select: {
            orderNo: true,
          },
        },
      },
    });

  if (estimate) {
    if (
      estimate.status ===
        "SENT" &&
      approvalLinkExpired(
        estimate.sentAt ||
          estimate.createdAt,
        APPROVAL_MAX_AGE_MS,
      )
    ) {
      return expiredResponse();
    }

    return NextResponse.json(
      {
        type:
          "venticEstimate",
        id: estimate.id,
        orderNo:
          estimate.order
            .orderNo,
        version:
          estimate.version,
        status:
          estimate.status,
        subtotal:
          moneyNumber(
            estimate.subtotal,
          ),
        discount:
          moneyNumber(
            estimate.discount,
          ),
        total:
          moneyNumber(
            estimate.total,
          ),
        notes:
          estimate.notes,
        sentAt:
          estimate.sentAt,
        respondedAt:
          estimate.respondedAt,
        items:
          estimate.items.map(
            (item) => {
              const qty =
                moneyNumber(
                  item.qty,
                );
              const unitPrice =
                moneyNumber(
                  item.unitPrice,
                );

              return {
                id: item.id,
                description:
                  item.description,
                unit:
                  item.unit,
                qty,
                unitPrice,
                lineTotal:
                  roundMoney(
                    qty *
                      unitPrice,
                  ),
              };
            },
          ),
      },
      {
        headers:
          publicHeaders(),
      },
    );
  }

  const quote =
    await prisma.quote.findUnique({
      where: {
        customerToken:
          token,
      },
    });

  if (quote) {
    if (
      quote.status === "SENT" &&
      approvalLinkExpired(
        quote.sentAt ||
          quote.createdAt,
        APPROVAL_MAX_AGE_MS,
      )
    ) {
      return expiredResponse();
    }

    return NextResponse.json(
      {
        type: "quote",
        status:
          quote.status,
        amount:
          moneyNumber(
            quote.amount,
          ),
        notes:
          quote.notes,
      },
      {
        headers:
          publicHeaders(),
      },
    );
  }

  const extra =
    await prisma.extraCharge.findUnique({
      where: {
        customerToken:
          token,
      },
    });

  if (extra) {
    if (
      extra.status ===
        "PENDING" &&
      approvalLinkExpired(
        extra.createdAt,
        APPROVAL_MAX_AGE_MS,
      )
    ) {
      return expiredResponse();
    }

    return NextResponse.json(
      {
        type: "extra",
        status:
          extra.status,
        title:
          extra.title,
        reason:
          extra.reason,
        amount:
          moneyNumber(
            extra.amount,
          ),
      },
      {
        headers:
          publicHeaders(),
      },
    );
  }

  return NextResponse.json(
    {
      error:
        "الرابط غير صالح",
    },
    {
      status: 404,
      headers:
        publicHeaders(),
    },
  );
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      token: string;
    }>;
  },
) {
  const { token } = await params;

  const limited = rateLimit(
    `approval-write:${clientIp(
      req,
    )}:${token.slice(0, 12)}`,
    {
      limit: 20,
      windowMs:
        15 * 60 * 1000,
    },
  );

  if (!limited.allowed) {
    return NextResponse.json(
      {
        error:
          "تم تجاوز عدد المحاولات. حاول مرة أخرى بعد قليل.",
      },
      {
        status: 429,
        headers:
          rateLimitHeaders(
            limited,
          ),
      },
    );
  }

  if (
    !token ||
    token.length < 32
  ) {
    return NextResponse.json(
      {
        error:
          "الرابط غير صالح",
      },
      { status: 404 },
    );
  }

  const body =
    await req.json();
  const decision =
    body?.decision;

  if (
    decision !== "accept" &&
    decision !== "reject"
  ) {
    return NextResponse.json(
      {
        error:
          "قرار غير صالح",
      },
      { status: 400 },
    );
  }

  const accepted =
    decision === "accept";

  const estimate =
    await prisma.venticEstimate.findUnique({
      where: {
        customerToken:
          token,
      },
      include: {
        items: true,
        order: {
          select: {
            orderNo: true,
          },
        },
      },
    });

  if (estimate) {
    if (
      estimate.status !==
      "SENT"
    ) {
      return NextResponse.json(
        {
          error:
            "تم الرد على هذه المقايسة بالفعل",
        },
        { status: 409 },
      );
    }

    if (
      approvalLinkExpired(
        estimate.sentAt ||
          estimate.createdAt,
        APPROVAL_MAX_AGE_MS,
      )
    ) {
      return expiredResponse();
    }

    let synced: any =
      null;

    await prisma.$transaction(
      async (tx) => {
        const fresh =
          await tx.venticEstimate.findUnique({
            where: {
              id: estimate.id,
            },
          });

        if (
          !fresh ||
          fresh.status !==
            "SENT"
        ) {
          throw new Error(
            "ALREADY_RESPONDED",
          );
        }

        if (accepted) {
          await tx.venticEstimate.updateMany({
            where: {
              orderId:
                estimate.orderId,
              status:
                "ACCEPTED",
              NOT: {
                id: estimate.id,
              },
            },
            data: {
              status:
                "SUPERSEDED",
            },
          });

          await tx.venticEstimate.update({
            where: {
              id: estimate.id,
            },
            data: {
              status:
                "ACCEPTED",
              respondedAt:
                new Date(),
            },
          });

          synced =
            await syncOrderInvoice(
              tx,
              estimate.orderId,
            );

          await tx.auditLog.create({
            data: {
              orderId:
                estimate.orderId,
              actorLabel:
                "العميل",
              action:
                "VENTIC_ESTIMATE_ACCEPTED",
              newValue: {
                estimateId:
                  estimate.id,
                version:
                  estimate.version,
                estimateTotal:
                  moneyNumber(
                    estimate.total,
                  ),
                finalTotal:
                  synced
                    .financials
                    .total,
                invoiceId:
                  synced.invoice
                    .id,
              },
            },
          });
        } else {
          await tx.venticEstimate.update({
            where: {
              id: estimate.id,
            },
            data: {
              status:
                "REJECTED",
              respondedAt:
                new Date(),
            },
          });

          await tx.auditLog.create({
            data: {
              orderId:
                estimate.orderId,
              actorLabel:
                "العميل",
              action:
                "VENTIC_ESTIMATE_REJECTED",
              newValue: {
                estimateId:
                  estimate.id,
                version:
                  estimate.version,
              },
            },
          });
        }
      },
      {
        isolationLevel:
          "Serializable",
      },
    ).catch((error: any) => {
      if (
        error?.message ===
        "ALREADY_RESPONDED"
      ) {
        throw error;
      }
      throw error;
    });

    await notifyAdmins({
      type:
        AdminNotificationType.QUOTATION_RESPONSE,
      title: `${
        accepted
          ? "تمت الموافقة على"
          : "تم رفض"
      } مقايسة ${
        estimate.order.orderNo
      }`,
      message: accepted
        ? `العميل وافق على مقايسة Ventic Pro إصدار ${estimate.version}.`
        : `العميل رفض مقايسة Ventic Pro إصدار ${estimate.version}.`,
      orderId:
        estimate.orderId,
      href: `/admin/orders/${estimate.orderId}`,
      dedupeKey: `estimate-response:${estimate.id}`,
    });

    return NextResponse.json({
      ok: true,
      type:
        "venticEstimate",
      decision,
      financials:
        synced?.financials ||
        null,
    });
  }

  const quote =
    await prisma.quote.findUnique({
      where: {
        customerToken:
          token,
      },
      include: {
        order: {
          select: {
            orderNo: true,
          },
        },
      },
    });

  if (quote) {
    if (
      quote.status !==
      "SENT"
    ) {
      return NextResponse.json(
        {
          error:
            "تم الرد على عرض السعر بالفعل",
        },
        { status: 409 },
      );
    }

    if (
      approvalLinkExpired(
        quote.sentAt ||
          quote.createdAt,
        APPROVAL_MAX_AGE_MS,
      )
    ) {
      return expiredResponse();
    }

    let synced: any =
      null;

    await prisma.$transaction(
      async (tx) => {
        const fresh =
          await tx.quote.findUnique({
            where: {
              id: quote.id,
            },
          });

        if (
          !fresh ||
          fresh.status !==
            "SENT"
        ) {
          throw new Error(
            "ALREADY_RESPONDED",
          );
        }

        await tx.quote.update({
          where: {
            id: quote.id,
          },
          data: {
            status: accepted
              ? "ACCEPTED"
              : "REJECTED",
            respondedAt:
              new Date(),
          },
        });

        if (accepted) {
          synced =
            await syncOrderInvoice(
              tx,
              quote.orderId,
            );
        }

        await tx.auditLog.create({
          data: {
            orderId:
              quote.orderId,
            actorLabel:
              "العميل",
            action: accepted
              ? "LEGACY_QUOTE_ACCEPTED"
              : "LEGACY_QUOTE_REJECTED",
            newValue: {
              quoteId:
                quote.id,
              amount:
                moneyNumber(
                  quote.amount,
                ),
              finalTotal:
                synced
                  ?.financials
                  ?.total ||
                null,
            },
          },
        });
      },
      {
        isolationLevel:
          "Serializable",
      },
    );

    await notifyAdmins({
      type:
        AdminNotificationType.QUOTATION_RESPONSE,
      title: `${
        accepted
          ? "تمت الموافقة على"
          : "تم رفض"
      } عرض ${
        quote.order.orderNo
      }`,
      message: `العميل ${
        accepted
          ? "وافق على"
          : "رفض"
      } عرض السعر بقيمة ${moneyNumber(
        quote.amount,
      ).toLocaleString(
        "ar-EG",
      )} ج.`,
      orderId:
        quote.orderId,
      href: `/admin/orders/${quote.orderId}`,
      dedupeKey: `quote-response:${quote.id}`,
    });

    return NextResponse.json({
      ok: true,
      type: "quote",
      decision,
      financials:
        synced?.financials ||
        null,
    });
  }

  const extra =
    await prisma.extraCharge.findUnique({
      where: {
        customerToken:
          token,
      },
      include: {
        order: {
          select: {
            orderNo: true,
          },
        },
      },
    });

  if (extra) {
    if (
      extra.status !==
      "PENDING"
    ) {
      return NextResponse.json(
        {
          error:
            "تم الرد على التكلفة الإضافية بالفعل",
        },
        { status: 409 },
      );
    }

    if (
      approvalLinkExpired(
        extra.createdAt,
        APPROVAL_MAX_AGE_MS,
      )
    ) {
      return expiredResponse();
    }

    let synced: any =
      null;

    await prisma.$transaction(
      async (tx) => {
        const fresh =
          await tx.extraCharge.findUnique({
            where: {
              id: extra.id,
            },
          });

        if (
          !fresh ||
          fresh.status !==
            "PENDING"
        ) {
          throw new Error(
            "ALREADY_RESPONDED",
          );
        }

        await tx.extraCharge.update({
          where: {
            id: extra.id,
          },
          data: {
            status: accepted
              ? "APPROVED"
              : "REJECTED",
            respondedAt:
              new Date(),
          },
        });

        if (accepted) {
          const current =
            await calculateOrderFinancials(
              tx,
              extra.orderId,
            );

          if (
            current.authoritative
          ) {
            synced =
              await syncOrderInvoice(
                tx,
                extra.orderId,
              );
          }
        }

        await tx.auditLog.create({
          data: {
            orderId:
              extra.orderId,
            actorLabel:
              "العميل",
            action: accepted
              ? "EXTRA_CHARGE_ACCEPTED"
              : "EXTRA_CHARGE_REJECTED",
            newValue: {
              extraChargeId:
                extra.id,
              title:
                extra.title,
              amount:
                moneyNumber(
                  extra.amount,
                ),
              finalTotal:
                synced
                  ?.financials
                  ?.total ||
                null,
              invoiceId:
                synced
                  ?.invoice?.id ||
                null,
            },
          },
        });
      },
      {
        isolationLevel:
          "Serializable",
      },
    );

    await notifyAdmins({
      type:
        AdminNotificationType.EXTRA_CHARGE_RESPONSE,
      title: `${
        accepted
          ? "تم قبول"
          : "تم رفض"
      } تكلفة إضافية — ${
        extra.order.orderNo
      }`,
      message: accepted
        ? `العميل وافق على ${extra.title} بقيمة ${moneyNumber(
            extra.amount,
          ).toLocaleString(
            "ar-EG",
          )} ج.`
        : `العميل رفض ${extra.title} بقيمة ${moneyNumber(
            extra.amount,
          ).toLocaleString(
            "ar-EG",
          )} ج.`,
      orderId:
        extra.orderId,
      href: `/admin/orders/${extra.orderId}`,
      dedupeKey: `extra-response:${extra.id}`,
    });

    return NextResponse.json({
      ok: true,
      type: "extra",
      decision,
      financials:
        synced?.financials ||
        null,
    });
  }

  return NextResponse.json(
    {
      error:
        "الرابط غير صالح",
    },
    { status: 404 },
  );
}
