import { AdminNotificationType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.CUSTOMER_SERVICE,
];

type NotifyAdminsInput = {
  type: AdminNotificationType;
  title: string;
  message: string;
  orderId?: string;
  href?: string;
  roles?: UserRole[];
  dedupeKey?: string;
};

export async function notifyAdmins(input: NotifyAdminsInput) {
  try {
    const recipients = await prisma.user.findMany({
      where: {
        active: true,
        role: { in: input.roles || DEFAULT_ROLES },
      },
      select: { id: true },
    });

    if (!recipients.length) return;

    let recipientIds = recipients.map((recipient) => recipient.id);

    if (input.dedupeKey) {
      const existing = await prisma.adminNotification.findMany({
        where: {
          recipientId: { in: recipientIds },
          dedupeKey: input.dedupeKey,
        },
        select: { recipientId: true },
      });

      const existingRecipientIds = new Set(
        existing.map((notification) => notification.recipientId),
      );

      recipientIds = recipientIds.filter(
        (recipientId) => !existingRecipientIds.has(recipientId),
      );
    }

    if (!recipientIds.length) return;

    await prisma.adminNotification.createMany({
      data: recipientIds.map((recipientId) => ({
        recipientId,
        orderId: input.orderId,
        type: input.type,
        title: input.title,
        message: input.message,
        href: input.href,
        dedupeKey: input.dedupeKey,
      })),
    });
  } catch (error) {
    // A notification failure must never block the business action itself.
    console.error("ADMIN_NOTIFICATION_ERROR", error);
  }
}
