import { NextResponse } from "next/server";
import {
  archiveActorFor,
  archivePermissions,
  getVaultSetting,
  isVaultUnlockedFor,
} from "@/lib/archive-vault";

export async function GET() {
  const actor =
    await archiveActorFor();

  if (!actor) {
    return NextResponse.json(
      {
        error:
          "UNAUTHENTICATED",
      },
      { status: 401 },
    );
  }

  const setting =
    await getVaultSetting();
  const permissions =
    archivePermissions(actor);

  return NextResponse.json({
    configured:
      Boolean(setting),
    unlocked:
      setting &&
      permissions.canView
        ? await isVaultUnlockedFor(
            actor.id,
          )
        : false,
    isSuperAdmin:
      actor.role ===
      "SUPER_ADMIN",
    ...permissions,
  });
}
