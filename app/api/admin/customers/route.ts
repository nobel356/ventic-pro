import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }

    const allowed =
      can(
        user.role,
        PERMISSIONS.CUSTOMER_SENSITIVE,
        user.permissions,
      ) ||
      can(
        user.role,
        PERMISSIONS.CUSTOMER_ACCOUNTS_EDIT,
        user.permissions,
      );

    if (!allowed) {
      return NextResponse.json(
        { error: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const customers =
      await prisma.customer.findMany({
        include: {
          orders: {
            select: {
              id: true,
              createdAt: true,
              invoice: {
                select: {
                  id: true,
                  total: true,
                  due: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          sessions: {
            select: {
              expiresAt: true,
            },
          },
          _count: {
            select: {
              properties: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 500,
      });

    const now = Date.now();

    return NextResponse.json({
      customers: customers.map(
        (customer) => {
          const invoices =
            customer.orders
              .map(
                (order) =>
                  order.invoice,
              )
              .filter(Boolean);

          return {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            active:
              customer.active,
            hasAccount:
              Boolean(
                customer.passwordHash,
              ),
            orderCount:
              customer.orders.length,
            propertyCount:
              customer._count
                .properties,
            invoiceCount:
              invoices.length,
            totalBilled:
              invoices.reduce(
                (sum, invoice) =>
                  sum +
                  Number(
                    invoice?.total ||
                      0,
                  ),
                0,
              ),
            totalDue:
              invoices.reduce(
                (sum, invoice) =>
                  sum +
                  Number(
                    invoice?.due ||
                      0,
                  ),
                0,
              ),
            activeSessions:
              customer.sessions.filter(
                (session) =>
                  session.expiresAt.getTime() >
                  now,
              ).length,
            createdAt:
              customer.createdAt,
          };
        },
      ),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر تحميل العملاء",
      },
      { status: 500 },
    );
  }
}
