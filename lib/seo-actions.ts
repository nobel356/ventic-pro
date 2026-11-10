import { prisma } from "@/lib/prisma";
import {
  buildSeoHealth,
  type SeoIssue,
} from "@/lib/seo-health";

export type SeoActionStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "SNOOZED"
  | "RESOLVED";

export type SeoActionItem = SeoIssue & {
  status: SeoActionStatus;
  ownerLabel: string | null;
  note: string | null;
  dueAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
};

function safeStatus(value: string): SeoActionStatus {
  if (value === "IN_PROGRESS") return "IN_PROGRESS";
  if (value === "SNOOZED") return "SNOOZED";
  if (value === "RESOLVED") return "RESOLVED";
  return "TODO";
}

export async function syncSeoActions() {
  const health = await buildSeoHealth();
  const now = new Date();
  const currentKeys = health.issues.map((issue) => issue.id);

  await prisma.$transaction(async (tx) => {
    for (const issue of health.issues) {
      const existing = await tx.seoActionState.findUnique({
        where: {
          issueKey: issue.id,
        },
      });

      if (!existing) {
        await tx.seoActionState.create({
          data: {
            issueKey: issue.id,
            status: "TODO",
            firstSeenAt: now,
            lastSeenAt: now,
          },
        });
        continue;
      }

      await tx.seoActionState.update({
        where: {
          issueKey: issue.id,
        },
        data: {
          lastSeenAt: now,
          ...(existing.status === "RESOLVED"
            ? {
                status: "TODO",
                resolvedAt: null,
              }
            : {}),
        },
      });
    }

    if (currentKeys.length > 0) {
      await tx.seoActionState.updateMany({
        where: {
          issueKey: {
            notIn: currentKeys,
          },
          status: {
            not: "RESOLVED",
          },
        },
        data: {
          status: "RESOLVED",
          resolvedAt: now,
          lastSeenAt: now,
        },
      });
    } else {
      await tx.seoActionState.updateMany({
        where: {
          status: {
            not: "RESOLVED",
          },
        },
        data: {
          status: "RESOLVED",
          resolvedAt: now,
          lastSeenAt: now,
        },
      });
    }
  });

  const states =
    await prisma.seoActionState.findMany({
      orderBy: [
        { status: "asc" },
        { dueAt: "asc" },
        { updatedAt: "desc" },
      ],
    });

  const stateMap = new Map(
    states.map((state) => [
      state.issueKey,
      state,
    ]),
  );

  const active: SeoActionItem[] =
    health.issues.map((issue) => {
      const state =
        stateMap.get(issue.id);

      return {
        ...issue,
        status: safeStatus(
          state?.status || "TODO",
        ),
        ownerLabel:
          state?.ownerLabel || null,
        note: state?.note || null,
        dueAt:
          state?.dueAt?.toISOString() ||
          null,
        firstSeenAt:
          (
            state?.firstSeenAt ||
            now
          ).toISOString(),
        lastSeenAt:
          (
            state?.lastSeenAt ||
            now
          ).toISOString(),
        resolvedAt:
          state?.resolvedAt?.toISOString() ||
          null,
      };
    });

  const resolved = states
    .filter(
      (state) =>
        state.status === "RESOLVED",
    )
    .slice(0, 50)
    .map((state) => ({
      issueKey: state.issueKey,
      status: safeStatus(
        state.status,
      ),
      ownerLabel:
        state.ownerLabel || null,
      note: state.note || null,
      dueAt:
        state.dueAt?.toISOString() ||
        null,
      firstSeenAt:
        state.firstSeenAt.toISOString(),
      lastSeenAt:
        state.lastSeenAt.toISOString(),
      resolvedAt:
        state.resolvedAt?.toISOString() ||
        null,
    }));

  return {
    health,
    active,
    resolved,
  };
}
