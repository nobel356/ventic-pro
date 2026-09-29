import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOM_PERMISSIONS_MARKER,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/lib/permission-config";

export { PERMISSIONS } from "@/lib/permission-config";

export async function currentUser() {
  const jar = await cookies();
  const raw = jar.get("ventic_session")?.value;
  if (!raw) return null;

  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const session = await prisma.session.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.active) {
    return null;
  }

  return session.user;
}

export function can(
  role: string,
  permission: string,
  permissions: string[] = [],
) {
  if (role === "SUPER_ADMIN") return true;

  if (permissions.includes(CUSTOM_PERMISSIONS_MARKER)) {
    return permissions.includes(permission);
  }

  return (ROLE_DEFAULT_PERMISSIONS[role] || []).some(
    (item) => item === permission,
  );
}

export async function requirePermission(permission: string) {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!can(user.role, permission, user.permissions)) throw new Error("FORBIDDEN");
  return user;
}

export async function requireSuperAdmin() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (user.role !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  return user;
}
