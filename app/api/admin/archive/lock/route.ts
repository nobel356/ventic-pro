import { NextResponse } from "next/server";
import {
  ARCHIVE_VAULT_COOKIE,
  archiveActorFor,
  logArchiveEvent,
} from "@/lib/archive-vault";

export async function POST() {
  const actor =
    await archiveActorFor();

  const response =
    NextResponse.json({
      ok: true,
    });

  response.cookies.set(
    ARCHIVE_VAULT_COOKIE,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    },
  );

  if (actor) {
    await logArchiveEvent(
      actor,
      "ARCHIVE_VAULT_LOCKED",
    );
  }

  return response;
}
