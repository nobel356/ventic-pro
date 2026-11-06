import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const DEFAULT_TTL_MS =
  24 * 60 * 60 * 1000;
const STALE_PROCESSING_MS =
  2 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}

function canonicalize(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(
      canonicalize,
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return Object.fromEntries(
      Object.entries(
        value as Record<
          string,
          unknown
        >,
      )
        .sort(([a], [b]) =>
          a.localeCompare(b),
        )
        .map(
          ([key, item]) => [
            key,
            canonicalize(
              item,
            ),
          ],
        ),
    );
  }

  return value;
}

export function hashIdempotencyPayload(
  payload: unknown,
) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        canonicalize(
          payload,
        ),
      ),
    )
    .digest("hex");
}

export function normalizeIdempotencyKey(
  raw: string,
) {
  const key =
    String(raw || "")
      .trim();

  if (
    key.length < 16 ||
    key.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(
      key,
    )
  ) {
    return null;
  }

  return key;
}

type ClaimInput = {
  scope: string;
  key: string;
  requestHash: string;
  waitMs?: number;
};

export type IdempotencyClaim =
  | {
      kind: "OWNER";
      id: string;
    }
  | {
      kind: "REPLAY";
      response:
        Record<
          string,
          unknown
        >;
      resourceId:
        | string
        | null;
    }
  | {
      kind: "CONFLICT";
    }
  | {
      kind:
        "IN_PROGRESS";
    };

async function readExisting(
  scope: string,
  key: string,
) {
  return prisma.idempotencyRequest.findUnique({
    where: {
      scope_key: {
        scope,
        key,
      },
    },
  });
}

export async function claimIdempotency(
  input: ClaimInput,
  recoveryAttempt = false,
): Promise<IdempotencyClaim> {
  try {
    const row =
      await prisma.idempotencyRequest.create({
        data: {
          scope:
            input.scope,
          key:
            input.key,
          requestHash:
            input.requestHash,
          status:
            "PROCESSING",
          expiresAt:
            new Date(
              Date.now() +
                DEFAULT_TTL_MS,
            ),
        },
      });

    return {
      kind: "OWNER",
      id: row.id,
    };
  } catch (error: any) {
    if (
      error?.code !==
      "P2002"
    ) {
      throw error;
    }
  }

  const deadline =
    Date.now() +
    Math.max(
      0,
      input.waitMs ??
        2500,
    );

  while (true) {
    const existing =
      await readExisting(
        input.scope,
        input.key,
      );

    if (!existing) {
      if (
        Date.now() <
        deadline
      ) {
        await sleep(80);
        continue;
      }

      return {
        kind:
          "IN_PROGRESS",
      };
    }

    if (
      existing.requestHash !==
      input.requestHash
    ) {
      return {
        kind:
          "CONFLICT",
      };
    }

    if (
      existing.status ===
        "COMPLETED" &&
      existing.response &&
      typeof existing.response ===
        "object" &&
      !Array.isArray(
        existing.response,
      )
    ) {
      return {
        kind: "REPLAY",
        response:
          existing.response as Record<
            string,
            unknown
          >,
        resourceId:
          existing.resourceId,
      };
    }

    const stale =
      existing.status ===
        "PROCESSING" &&
      (existing.expiresAt <
        new Date() ||
        existing.updatedAt <
          new Date(
            Date.now() -
              STALE_PROCESSING_MS,
          ));

    if (
      stale &&
      !recoveryAttempt
    ) {
      const removed =
        await prisma.idempotencyRequest.deleteMany({
          where: {
            id:
              existing.id,
            status:
              "PROCESSING",
            updatedAt:
              existing.updatedAt,
          },
        });

      if (
        removed.count ===
        1
      ) {
        return claimIdempotency(
          input,
          true,
        );
      }
    }

    if (
      Date.now() >=
      deadline
    ) {
      return {
        kind:
          "IN_PROGRESS",
      };
    }

    await sleep(100);
  }
}

export async function completeIdempotency(
  input: {
    id: string;
    response:
      Record<
        string,
        unknown
      >;
    resourceId?: string;
  },
) {
  return prisma.idempotencyRequest.update({
    where: {
      id: input.id,
    },
    data: {
      status:
        "COMPLETED",
      resourceId:
        input.resourceId ||
        null,
      response:
        input.response,
      expiresAt:
        new Date(
          Date.now() +
            DEFAULT_TTL_MS,
        ),
    },
  });
}

export async function failIdempotency(
  id: string,
) {
  try {
    await prisma.idempotencyRequest.deleteMany({
      where: {
        id,
        status:
          "PROCESSING",
      },
    });
  } catch {
    // Cleanup must never hide the original request error.
  }
}
