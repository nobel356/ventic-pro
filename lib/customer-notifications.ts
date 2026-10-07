import { NotificationChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deliverCustomerMessage,
  sendEmail,
} from "@/lib/customer-messaging";

export function absoluteAppUrl(path: string) {
  const configured = String(
    process.env.NEXT_PUBLIC_APP_URL || "",
  ).replace(/\/+$/, "");

  if (configured) {
    return `${configured}${path.startsWith("/") ? path : `/${path}`}`;
  }

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (vercelHost) {
    return `https://${vercelHost}${path.startsWith("/") ? path : `/${path}`}`;
  }

  return path;
}

async function logNotification(input: {
  orderId?: string;
  customerId: string;
  channel: NotificationChannel;
  templateKey: string;
  destinationMasked?: string | null;
  payload?: Record<string, unknown>;
  provider: string;
  providerMessageId?: string;
  sent: boolean;
  error?: string;
}) {
  await prisma.notification.create({
    data: {
      orderId: input.orderId,
      customerId: input.customerId,
      channel: input.channel,
      templateKey: input.templateKey,
      destinationMasked: input.destinationMasked || null,
      payload: {
        ...(input.payload || {}),
        provider: input.provider,
      },
      status: input.sent ? "SENT" : "FAILED",
      providerMessageId: input.providerMessageId || null,
      error: input.sent ? null : input.error || "DELIVERY_FAILED",
      sentAt: input.sent ? new Date() : null,
    },
  });
}

export async function notifyCustomer(input: {
  orderId?: string;
  customerId: string;
  phone: string;
  email?: string | null;
  templateKey: string;
  message: string;
  subject?: string;
  templateVariables?: string[];
  payload?: Record<string, unknown>;
}) {
  try {
    const customer = input.email
      ? null
      : await prisma.customer.findUnique({
          where: { id: input.customerId },
          select: { email: true },
        });

    const email = input.email || customer?.email || null;

    const primary = await deliverCustomerMessage({
      phone: input.phone,
      templateKey: input.templateKey,
      templateVariables: input.templateVariables,
      subject: input.subject,
      message: input.message,
    });

    const primaryChannel: NotificationChannel =
      primary.channel === "WHATSAPP"
        ? "WHATSAPP"
        : primary.channel === "SMS"
          ? "SMS"
          : "IN_APP";

    await logNotification({
      orderId: input.orderId,
      customerId: input.customerId,
      channel: primaryChannel,
      templateKey: input.templateKey,
      destinationMasked: primary.destinationMasked,
      payload: input.payload,
      provider: primary.provider,
      providerMessageId: primary.providerMessageId,
      sent: primary.sent,
      error: primary.error,
    });

    let emailDelivery: Awaited<ReturnType<typeof sendEmail>> | null = null;

    if (email) {
      emailDelivery = await sendEmail({
        email,
        subject: input.subject || "Ventic Pro",
        message: input.message,
      });

      await logNotification({
        orderId: input.orderId,
        customerId: input.customerId,
        channel: "EMAIL",
        templateKey: `${input.templateKey}_EMAIL_COPY`,
        destinationMasked: emailDelivery.destinationMasked,
        payload: input.payload,
        provider: emailDelivery.provider,
        providerMessageId: emailDelivery.providerMessageId,
        sent: emailDelivery.sent,
        error: emailDelivery.error,
      });
    }

    return {
      primary,
      email: emailDelivery,
    };
  } catch (error) {
    console.error("CUSTOMER_NOTIFICATION_ERROR", error);

    return {
      primary: {
        sent: false,
        channel: "NONE" as const,
        provider: "internal",
        destinationMasked: "",
        error: "CUSTOMER_NOTIFICATION_ERROR",
      },
      email: null,
    };
  }
}
