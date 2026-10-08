import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  rawPrisma?: PrismaClient;
};

export const rawPrisma =
  globalForPrisma.rawPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.rawPrisma = rawPrisma;
}

const guardedReadOperations = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

const guardedWriteOperations = new Set([
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

function addWhere(args: unknown, filter: Record<string, unknown>) {
  const mutable = args as { where?: Record<string, unknown> };
  mutable.where = mutable.where
    ? { AND: [mutable.where, filter] }
    : filter;
}

function guardArchived(
  operation: string,
  args: unknown,
  filter: Record<string, unknown>,
  protectWrites = false,
) {
  if (
    guardedReadOperations.has(operation) ||
    (protectWrites && guardedWriteOperations.has(operation))
  ) {
    addWhere(args, filter);
  }
}

/**
 * Normal application Prisma client.
 *
 * Archived Orders/Users are hidden centrally so old screens and reports do not
 * accidentally keep showing soft-deleted records.
 *
 * Archive Vault code MUST use rawPrisma instead.
 */
export const prisma = rawPrisma.$extends({
  name: "ventic-archive-visibility",
  query: {
    order: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, { archivedAt: null }, true);
        return query(args);
      },
    },
    user: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, { archivedAt: null }, true);
        return query(args);
      },
    },

    payment: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    invoice: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    warranty: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    maintenanceRequest: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    complaint: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    review: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    quote: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    venticEstimate: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    venticEstimateItem: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          estimate: {
            order: { archivedAt: null },
          },
        });
        return query(args);
      },
    },
    extraCharge: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    attachment: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    space: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          order: { archivedAt: null },
        });
        return query(args);
      },
    },
    orderService: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          space: {
            order: { archivedAt: null },
          },
        });
        return query(args);
      },
    },

    technicianSlot: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          OR: [
            { orderId: null },
            { order: { archivedAt: null } },
          ],
        });
        return query(args);
      },
    },
    inventoryMovement: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          OR: [
            { orderId: null },
            { order: { archivedAt: null } },
          ],
        });
        return query(args);
      },
    },
    notification: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          OR: [
            { orderId: null },
            { order: { archivedAt: null } },
          ],
        });
        return query(args);
      },
    },
    adminNotification: {
      async $allOperations({ operation, args, query }) {
        guardArchived(operation, args, {
          OR: [
            { orderId: null },
            { order: { archivedAt: null } },
          ],
        });
        return query(args);
      },
    },
  },
});
