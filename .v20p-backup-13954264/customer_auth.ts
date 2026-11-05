import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const CUSTOMER_SESSION_COOKIE =
  "ventic_customer_session";

export function normalizeCustomerPhone(
  value: unknown,
) {
  return String(value || "").replace(/\D/g, "");
}

export function validEgyptMobile(phone: string) {
  return /^01\d{9}$/.test(phone);
}

export async function createCustomerSession(
  customerId: string,
) {
  const now = new Date();

  await prisma.customerSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        {
          customerId,
          createdAt: {
            lt: new Date(
              Date.now() -
                60 *
                  24 *
                  60 *
                  60 *
                  1000,
            ),
          },
        },
      ],
    },
  });

  const activeSessions =
    await prisma.customerSession.findMany({
      where: {
        customerId,
        expiresAt: { gt: now },
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: 9,
    });

  if (activeSessions.length) {
    await prisma.customerSession.deleteMany({
      where: {
        id: {
          in: activeSessions.map(
            (session) => session.id,
          ),
        },
      },
    });
  }

  const raw = crypto
    .randomBytes(32)
    .toString("hex");
  const tokenHash = crypto
    .createHash("sha256")
    .update(raw)
    .digest("hex");
  const expiresAt = new Date(
    Date.now() +
      1000 * 60 * 60 * 24 * 30,
  );

  await prisma.customerSession.create({
    data: {
      tokenHash,
      customerId,
      expiresAt,
    },
  });

  return { raw, expiresAt };
}

export async function currentCustomer() {
  const jar = await cookies();
  const raw =
    jar.get(
      CUSTOMER_SESSION_COOKIE,
    )?.value;

  if (!raw) return null;

  const tokenHash = crypto
    .createHash("sha256")
    .update(raw)
    .digest("hex");

  const session =
    await prisma.customerSession.findUnique({
      where: { tokenHash },
      include: { customer: true },
    });

  if (
    !session ||
    session.expiresAt < new Date() ||
    !session.customer.active
  ) {
    return null;
  }

  return session.customer;
}
