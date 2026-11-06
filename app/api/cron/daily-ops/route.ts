import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrandedEmail } from "@/lib/branded-email";
import {
  absoluteAppUrl,
  notifyCustomer,
} from "@/lib/customer-notifications";
import {
  executiveDigestText,
  getExecutiveDigest,
} from "@/lib/executive-digest";
import {
  safeDiagnostic,
  safeDiagnosticError,
} from "@/lib/safe-diagnostics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

function cairoDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function authorized(req: Request) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  const auth = String(req.headers.get("authorization") || "").trim();
  return Boolean(secret) && auth === `Bearer ${secret}`;
}

function reminderThreshold(endsAt: Date, now: Date) {
  const days = Math.round(
    (endsAt.getTime() - now.getTime()) / DAY_MS,
  );
  return days === 30 || days === 7 ? days : null;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const now = new Date();
  const today = cairoDateKey(now);

  const summary = {
    date: today,
    expiredMarked: 0,
    warrantyCandidates: 0,
    warrantySent: 0,
    warrantySkipped: 0,
    warrantyFailed: 0,
    digestSent: 0,
    digestSkipped: 0,
    digestFailed: 0,
    errors: 0,
  };

  try {
    const expired = await prisma.warranty.updateMany({
      where: {
        status: "ACTIVE",
        endsAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    });

    summary.expiredMarked = expired.count;
  } catch (error) {
    summary.errors += 1;
    safeDiagnosticError(
      "cron.daily_ops.expire_warranties",
      error,
    );
  }

  try {
    const windowEnd = new Date(now.getTime() + 31 * DAY_MS);

    const warranties = await prisma.warranty.findMany({
      where: {
        status: "ACTIVE",
        endsAt: {
          gt: now,
          lte: windowEnd,
        },
      },
      include: {
        order: {
          select: {
            orderNo: true,
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { endsAt: "asc" },
      take: 250,
    });

    summary.warrantyCandidates = warranties.length;

    for (const warranty of warranties) {
      const threshold = reminderThreshold(warranty.endsAt, now);
      if (!threshold) continue;

      const templateKey = `WARRANTY_EXPIRY_${threshold}D`;

      const alreadySent = await prisma.notification.findFirst({
        where: {
          orderId: warranty.orderId,
          customerId: warranty.order.customer.id,
          status: "SENT",
          templateKey: {
            in: [
              templateKey,
              `${templateKey}_EMAIL_COPY`,
            ],
          },
        },
        select: { id: true },
      });

      if (alreadySent) {
        summary.warrantySkipped += 1;
        continue;
      }

      const expiry = warranty.endsAt.toLocaleDateString("ar-EG", {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const warrantyUrl = absoluteAppUrl(
        `/customer/account/warranty/${warranty.orderId}`,
      );

      const customer = warranty.order.customer;

      const delivery = await notifyCustomer({
        orderId: warranty.orderId,
        customerId: customer.id,
        phone: customer.phone,
        email: customer.email,
        templateKey,
        subject: `تذكير ضمان Ventic Pro — ${threshold} يوم`,
        message:
          `أهلاً ${customer.name}،\n\n` +
          `ضمان الطلب ${warranty.order.orderNo} ينتهي يوم ${expiry}، والمتبقي تقريبًا ${threshold} يوم.\n` +
          "لو عندك أي ملاحظة على التركيب أو محتاج صيانة، الأفضل تسجل الطلب من حسابك قبل انتهاء الضمان.\n\n" +
          `تفاصيل الضمان:\n${warrantyUrl}`,
        payload: {
          warrantyId: warranty.id,
          thresholdDays: threshold,
          endsAt: warranty.endsAt.toISOString(),
        },
      });

      const sent = Boolean(
        delivery?.primary?.sent || delivery?.email?.sent,
      );

      if (sent) summary.warrantySent += 1;
      else summary.warrantyFailed += 1;
    }
  } catch (error) {
    summary.errors += 1;
    safeDiagnosticError(
      "cron.daily_ops.warranty_reminders",
      error,
    );
  }

  try {
    const admins = await prisma.user.findMany({
      where: {
        role: "SUPER_ADMIN",
        active: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const digest = await getExecutiveDigest();

    for (const admin of admins) {
      const marker = `cron-digest:${today}:${admin.id}`;

      const alreadySent = await prisma.auditLog.findFirst({
        where: {
          action: "DAILY_DIGEST_AUTO_SENT",
          actorLabel: marker,
        },
        select: { id: true },
      });

      if (alreadySent) {
        summary.digestSkipped += 1;
        continue;
      }

      const delivery = await sendBrandedEmail({
        email: admin.email,
        subject: "Ventic Pro — الملخص التنفيذي اليومي",
        message: executiveDigestText(digest),
      });

      if (!delivery.sent) {
        summary.digestFailed += 1;
        continue;
      }

      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorLabel: marker,
          action: "DAILY_DIGEST_AUTO_SENT",
          newValue: {
            date: today,
            provider: delivery.provider,
            destinationMasked: delivery.destinationMasked,
          },
        },
      });

      summary.digestSent += 1;
    }
  } catch (error) {
    summary.errors += 1;
    safeDiagnosticError(
      "cron.daily_ops.daily_digest",
      error,
    );
  }

  safeDiagnostic("cron.daily_ops.complete", {
    date: summary.date,
    expiredMarked: summary.expiredMarked,
    warrantyCandidates: summary.warrantyCandidates,
    warrantySent: summary.warrantySent,
    warrantySkipped: summary.warrantySkipped,
    warrantyFailed: summary.warrantyFailed,
    digestSent: summary.digestSent,
    digestSkipped: summary.digestSkipped,
    digestFailed: summary.digestFailed,
    errors: summary.errors,
  });

  return NextResponse.json({
    ok: summary.errors === 0,
    ...summary,
  });
}
