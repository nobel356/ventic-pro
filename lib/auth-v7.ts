import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOM_PERMISSIONS_MARKER,
  ROLE_DEFAULT_PERMISSIONS,
  PERMISSIONS,
} from "@/lib/permission-config";

export { PERMISSIONS } from "@/lib/permission-config";

const IMPERSONATION_COOKIE =
  "ventic_impersonation";
const IMPERSONATION_TTL_MS =
  8 * 60 * 60 * 1000;

export function can(
  role: string,
  permission: string,
  permissions: string[] = [],
) {
  if (role === "SUPER_ADMIN") return true;

  if (
    permissions.includes(
      CUSTOM_PERMISSIONS_MARKER,
    )
  ) {
    return permissions.includes(
      permission,
    );
  }

  return (
    ROLE_DEFAULT_PERMISSIONS[
      role
    ] || []
  ).some(
    (item) => item === permission,
  );
}

async function baseSessionUser() {
  const jar = await cookies();
  const raw =
    jar.get(
      "ventic_session",
    )?.value;

  if (!raw) return null;

  const hash = crypto
    .createHash("sha256")
    .update(raw)
    .digest("hex");

  const session =
    await prisma.session.findUnique({
      where: {
        tokenHash: hash,
      },
      include: {
        user: true,
      },
    });

  if (
    !session ||
    session.expiresAt <
      new Date() ||
    !session.user.active
  ) {
    return null;
  }

  return session.user;
}

function impersonationSecret() {
  const value =
    process.env.AUTH_SECRET;

  if (!value) {
    throw new Error(
      "AUTH_SECRET_MISSING",
    );
  }

  return value;
}

function signPayload(
  payload: string,
) {
  return crypto
    .createHmac(
      "sha256",
      impersonationSecret(),
    )
    .update(payload)
    .digest("base64url");
}

export function createImpersonationToken(
  targetUserId: string,
) {
  const expiresAt =
    Date.now() +
    IMPERSONATION_TTL_MS;
  const payload =
    `${targetUserId}.${expiresAt}`;

  return `${payload}.${signPayload(
    payload,
  )}`;
}

function verifyImpersonationToken(
  value: string,
) {
  const parts =
    String(value || "").split(
      ".",
    );

  if (parts.length !== 3) {
    return null;
  }

  const [
    targetUserId,
    expiresRaw,
    signature,
  ] = parts;
  const expiresAt =
    Number(expiresRaw);

  if (
    !targetUserId ||
    !Number.isFinite(
      expiresAt,
    ) ||
    expiresAt < Date.now()
  ) {
    return null;
  }

  const payload =
    `${targetUserId}.${expiresRaw}`;
  const expected =
    signPayload(payload);

  try {
    const valid =
      crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );

    return valid
      ? {
          targetUserId,
          expiresAt,
        }
      : null;
  } catch {
    return null;
  }
}

export async function authContext() {
  const baseUser =
    await baseSessionUser();

  if (!baseUser) {
    return {
      baseUser: null,
      user: null,
      impersonating:
        false,
    };
  }

  const jar = await cookies();
  const raw =
    jar.get(
      IMPERSONATION_COOKIE,
    )?.value;

  if (!raw) {
    return {
      baseUser,
      user: baseUser,
      impersonating:
        false,
    };
  }

  if (
    !can(
      baseUser.role,
      PERMISSIONS.USERS_IMPERSONATE,
      baseUser.permissions,
    )
  ) {
    return {
      baseUser,
      user: baseUser,
      impersonating:
        false,
    };
  }

  const verified =
    verifyImpersonationToken(
      raw,
    );

  if (!verified) {
    return {
      baseUser,
      user: baseUser,
      impersonating:
        false,
    };
  }

  const target =
    await prisma.user.findUnique({
      where: {
        id: verified.targetUserId,
      },
    });

  if (!target?.active) {
    return {
      baseUser,
      user: baseUser,
      impersonating:
        false,
    };
  }

  if (
    target.role ===
      "SUPER_ADMIN" &&
    baseUser.role !==
      "SUPER_ADMIN"
  ) {
    return {
      baseUser,
      user: baseUser,
      impersonating:
        false,
    };
  }

  return {
    baseUser,
    user: target,
    impersonating:
      target.id !==
      baseUser.id,
  };
}

export async function currentUser() {
  const context =
    await authContext();

  return context.user;
}

export async function requirePermission(
  permission: string,
) {
  const user =
    await currentUser();

  if (!user) {
    throw new Error(
      "UNAUTHENTICATED",
    );
  }

  if (
    !can(
      user.role,
      permission,
      user.permissions,
    )
  ) {
    throw new Error(
      "FORBIDDEN",
    );
  }

  return user;
}

export async function requireBasePermission(
  permission: string,
) {
  const context =
    await authContext();
  const user =
    context.baseUser;

  if (!user) {
    throw new Error(
      "UNAUTHENTICATED",
    );
  }

  if (
    !can(
      user.role,
      permission,
      user.permissions,
    )
  ) {
    throw new Error(
      "FORBIDDEN",
    );
  }

  return user;
}

export async function requireSuperAdmin() {
  const user =
    await currentUser();

  if (!user) {
    throw new Error(
      "UNAUTHENTICATED",
    );
  }

  if (
    user.role !==
    "SUPER_ADMIN"
  ) {
    throw new Error(
      "FORBIDDEN",
    );
  }

  return user;
}

export const authCookies = {
  impersonation:
    IMPERSONATION_COOKIE,
};
