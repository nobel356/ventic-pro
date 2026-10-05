import { NotificationChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deliverCustomerMessage,
} from "@/lib/customer-messaging";

export function absoluteAppUrl(
  path: string,
) {
  const configured = String(
    process.env
      .NEXT_PUBLIC_APP_URL ||
      "",
  ).replace(/\/+$/, "");

  if (configured) {
    return `${configured}${
      path.startsWith("/")
        ? path
        : `/${path}`
    }`;
  }

  const vercelHost =
    process.env
      .VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (vercelHost) {
    return `https://${vercelHost}${
      path.startsWith("/")
        ? path
        : `/${path}`
    }`;
  }

  return path;
}

export async function notifyCustomer(
  input: {
    orderId?: string;
    customerId: string;
    phone: string;
    email?: string | null;
    templateKey: string;
    message: string;
    subject?: string;
    templateVariables?: string[];
    payload?: Record<
      string,
      unknown
    >;
  },
) {
  try {
    const delivery =
      await deliverCustomerMessage(
        {
          phone: input.phone,
          email: input.email,
          templateKey:
            input.templateKey,
          templateVariables:
            input.templateVariables,
          subject:
            input.subject,
          message:
            input.message,
        },
      );

    const channel:
      NotificationChannel =
      delivery.channel ===
      "WHATSAPP"
        ? "WHATSAPP"
        : delivery.channel ===
            "SMS"
          ? "SMS"
          : delivery.channel ===
              "EMAIL"
            ? "EMAIL"
            : "IN_APP";

    await prisma.notification.create({
      data: {
        orderId:
          input.orderId,
        customerId:
          input.customerId,
        channel,
        templateKey:
          input.templateKey,
        destinationMasked:
          delivery
            .destinationMasked ||
          null,
        payload: {
          ...(input.payload ||
            {}),
          provider:
            delivery.provider,
        },
        status:
          delivery.sent
            ? "SENT"
            : "FAILED",
        providerMessageId:
          delivery
            .providerMessageId ||
          null,
        error:
          delivery.sent
            ? null
            : delivery.error ||
              "DELIVERY_FAILED",
        sentAt:
          delivery.sent
            ? new Date()
            : null,
      },
    });

    return delivery;
  } catch (error) {
    console.error(
      "CUSTOMER_NOTIFICATION_ERROR",
      error,
    );

    return {
      sent: false,
      channel:
        "NONE" as const,
      provider:
        "internal",
      destinationMasked: "",
      error:
        "CUSTOMER_NOTIFICATION_ERROR",
    };
  }
}
