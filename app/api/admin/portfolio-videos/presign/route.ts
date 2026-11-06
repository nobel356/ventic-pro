import {
  requireSuperAdmin,
} from "@/lib/auth-v7";

export async function POST() {
  try {
    await requireSuperAdmin();

    return Response.json(
      {
        error:
          "PORTFOLIO_BLOB_UPLOAD_DISABLED",
        detail:
          "Portfolio media uses YouTube/TikTok links. Legacy direct Blob video upload is disabled to prevent orphan files and unnecessary storage usage.",
      },
      { status: 410 },
    );
  } catch (error: any) {
    const message =
      String(
        error?.message ||
          "FORBIDDEN",
      );

    return Response.json(
      {
        error: message,
      },
      {
        status:
          message ===
          "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}
