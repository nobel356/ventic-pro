import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { currentUser } from "./auth-v7";

export const TECH_COOKIE = "ventic_tech";

export async function currentTechnician() {
  const sessionUser = await currentUser();
  if (sessionUser?.role === "TECHNICIAN" && sessionUser.active) {
    return sessionUser;
  }

  // Backward-compatible fallback for the old demo technician cookie.
  const jar = await cookies();
  const id = jar.get(TECH_COOKIE)?.value || process.env.DEMO_TECHNICIAN_ID;
  if (!id) return null;

  return prisma.user.findFirst({
    where: { id, role: "TECHNICIAN", active: true },
  });
}
