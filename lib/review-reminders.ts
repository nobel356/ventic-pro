import { prisma } from "@/lib/prisma";
import {
  absoluteAppUrl,
  notifyCustomer,
} from "@/lib/customer-notifications";

const REMINDER_HOURS = 48;
const TEMPLATE_KEY =
  "REVIEW_REMINDER_48H";

export async function runReviewReminderBatch(
  now = new Date(),
) {
  const cutoff =
    new Date(
      now.getTime() -
        REMINDER_HOURS *
          60 *
          60 *
          1000,
    );

  const orders =
    await prisma.order.findMany({
      where: {
        status: "COMPLETED",
        archivedAt: null,
        review: null,
        auditLogs: {
          some: {
            action: {
              in: [
                "ORDER_COMPLETED_WITH_OTP",
                "ORDER_COMPLETED",
              ],
            },
            createdAt: {
              lte: cutoff,
            },
          },
        },
      },
      select: {
        id: true,
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
      orderBy: {
        updatedAt: "asc",
      },
      take: 50,
    });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const order of orders) {
    const alreadySent =
      await prisma.notification.findFirst({
        where: {
          orderId: order.id,
          status: "SENT",
          templateKey: {
            in: [
              TEMPLATE_KEY,
              `${TEMPLATE_KEY}_EMAIL_COPY`,
            ],
          },
        },
        select: {
          id: true,
        },
      });

    if (alreadySent) {
      skipped += 1;
      continue;
    }

    const reviewUrl =
      absoluteAppUrl(
        `/customer/review/${order.id}`,
      );

    const delivery =
      await notifyCustomer({
        orderId: order.id,
        customerId:
          order.customer.id,
        phone:
          order.customer.phone,
        email:
          order.customer.email,
        templateKey:
          TEMPLATE_KEY,
        subject:
          `قيّم تجربتك مع Ventic Pro — ${order.orderNo}`,
        message:
          `أهلاً ${order.customer.name}، نتمنى يكون تنفيذ الطلب ${order.orderNo} تم بالشكل المطلوب.\n\n` +
          "تقييمك يساعدنا نراجع جودة التنفيذ ويحسن الخدمة للعملاء الجدد.\n\n" +
          `سجل تقييمك من هنا:\n${reviewUrl}`,
        payload: {
          reminderHours:
            REMINDER_HOURS,
          reviewUrl,
        },
      });

    const delivered =
      Boolean(
        delivery?.primary
          ?.sent ||
          delivery?.email
            ?.sent,
      );

    if (delivered) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return {
    candidates:
      orders.length,
    sent,
    skipped,
    failed,
    reminderHours:
      REMINDER_HOURS,
  };
}
