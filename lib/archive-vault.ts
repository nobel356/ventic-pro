import crypto from "crypto";
import { cookies } from "next/headers";
import { rawPrisma } from "@/lib/prisma";
import {
  authContext,
  can,
} from "@/lib/auth-v7";
import {
  PERMISSIONS,
} from "@/lib/permission-config";

export const ARCHIVE_VAULT_COOKIE =
  "ventic_archive_vault";

const VAULT_TTL_MS =
  20 * 60 * 1000;

function secret() {
  const value =
    process.env.AUTH_SECRET;

  if (!value) {
    throw new Error(
      "AUTH_SECRET_MISSING",
    );
  }

  return value;
}

function sign(payload: string) {
  return crypto
    .createHmac(
      "sha256",
      secret(),
    )
    .update(payload)
    .digest("base64url");
}

export function createVaultToken(
  userId: string,
  version: number,
) {
  const expiresAt =
    Date.now() + VAULT_TTL_MS;
  const payload =
    `${userId}.${version}.${expiresAt}`;

  return {
    value:
      `${payload}.${sign(payload)}`,
    expiresAt,
  };
}

export function verifyVaultToken(
  value: string,
  userId: string,
  version: number,
) {
  const parts =
    String(value || "").split(
      ".",
    );

  if (parts.length !== 4) {
    return false;
  }

  const [
    tokenUserId,
    versionRaw,
    expiresRaw,
    signature,
  ] = parts;

  const tokenVersion =
    Number(versionRaw);
  const expiresAt =
    Number(expiresRaw);

  if (
    tokenUserId !== userId ||
    tokenVersion !== version ||
    !Number.isFinite(expiresAt) ||
    expiresAt < Date.now()
  ) {
    return false;
  }

  const payload =
    `${tokenUserId}.${versionRaw}.${expiresRaw}`;
  const expected =
    sign(payload);

  try {
    const left =
      Buffer.from(signature);
    const right =
      Buffer.from(expected);

    if (
      left.length !== right.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      left,
      right,
    );
  } catch {
    return false;
  }
}

export async function archiveActorFor(
  permission?: string,
) {
  const context =
    await authContext();

  if (
    !context.baseUser ||
    context.impersonating
  ) {
    return null;
  }

  if (
    context.baseUser.role ===
    "TECHNICIAN"
  ) {
    return null;
  }

  if (
    permission &&
    !can(
      context.baseUser.role,
      permission,
      context.baseUser.permissions,
    )
  ) {
    return null;
  }

  return context.baseUser;
}

export async function requireArchiveActor(
  permission: string,
) {
  const context =
    await authContext();

  if (!context.baseUser) {
    throw new Error(
      "UNAUTHENTICATED",
    );
  }

  if (context.impersonating) {
    throw new Error(
      "ARCHIVE_NOT_ALLOWED_WHILE_IMPERSONATING",
    );
  }

  if (
    context.baseUser.role ===
      "TECHNICIAN" ||
    !can(
      context.baseUser.role,
      permission,
      context.baseUser.permissions,
    )
  ) {
    throw new Error(
      "FORBIDDEN",
    );
  }

  return context.baseUser;
}

export async function getVaultSetting() {
  return rawPrisma.archiveVaultSetting.findUnique({
    where: {
      id: "primary",
    },
  });
}

export async function isVaultUnlockedFor(
  userId: string,
) {
  const setting =
    await getVaultSetting();

  if (!setting) {
    return false;
  }

  const jar =
    await cookies();
  const token =
    jar.get(
      ARCHIVE_VAULT_COOKIE,
    )?.value;

  if (!token) {
    return false;
  }

  return verifyVaultToken(
    token,
    userId,
    setting.version,
  );
}

export async function requireVaultUnlocked(
  userId: string,
) {
  if (
    !(await isVaultUnlockedFor(
      userId,
    ))
  ) {
    throw new Error(
      "ARCHIVE_VAULT_LOCKED",
    );
  }
}

export function archivePermissions(
  user: {
    role: string;
    permissions: string[];
  },
) {
  return {
    canView: can(
      user.role,
      PERMISSIONS.ARCHIVE_VIEW,
      user.permissions,
    ),
    canArchive: can(
      user.role,
      PERMISSIONS.ARCHIVE_MANAGE,
      user.permissions,
    ),
    canRestore: can(
      user.role,
      PERMISSIONS.ARCHIVE_RESTORE,
      user.permissions,
    ),
  };
}

export async function logArchiveEvent(
  actor: {
    id: string;
    name: string;
  },
  action: string,
  data: {
    orderId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
  } = {},
) {
  await rawPrisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorLabel: actor.name,
      orderId:
        data.orderId || null,
      action,
      oldValue:
        data.oldValue as any,
      newValue:
        data.newValue as any,
    },
  });
}
