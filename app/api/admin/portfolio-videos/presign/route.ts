import crypto from "crypto";
import {
  issueSignedToken,
  presignUrl,
} from "@vercel/blob";
import { requireSuperAdmin } from "@/lib/auth-v7";

const MAX_SIZE =
  500 * 1024 * 1024;

const CONTENT_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

function safeExtension(
  value: unknown,
) {
  const ext =
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 8);

  if (
    ext === "mp4" ||
    ext === "mov" ||
    ext === "webm"
  ) {
    return ext;
  }

  return "mp4";
}

export async function POST(
  request: Request,
) {
  try {
    await requireSuperAdmin();

    const body =
      await request.json();

    const size =
      Number(body?.size || 0);

    const contentType =
      String(
        body?.contentType ||
          "",
      ).trim();

    if (
      !Number.isFinite(size) ||
      size <= 0 ||
      size > MAX_SIZE
    ) {
      return Response.json(
        {
          error:
            "INVALID_FILE_SIZE",
        },
        { status: 400 },
      );
    }

    if (
      !CONTENT_TYPES.has(
        contentType,
      )
    ) {
      return Response.json(
        {
          error:
            "INVALID_CONTENT_TYPE",
        },
        { status: 400 },
      );
    }

    const extension =
      safeExtension(
        body?.extension,
      );

    const pathname =
      `portfolio/${crypto.randomUUID()}.${extension}`;

    const validUntil =
      Date.now() +
      15 * 60 * 1000;

    const token =
      await issueSignedToken({
        pathname,
        operations: ["put"],
        allowedContentTypes: [
          contentType,
        ],
        maximumSizeInBytes:
          MAX_SIZE,
        validUntil,
      });

    const result =
      await presignUrl(
        token,
        {
          operation: "put",
          pathname,
          access: "private",
          validUntil,
          allowedContentTypes: [
            contentType,
          ],
          maximumSizeInBytes:
            MAX_SIZE,
          addRandomSuffix:
            false,
          allowOverwrite:
            false,
        },
      );

    return Response.json({
      pathname,
      presignedUrl:
        result.presignedUrl,
    });
  } catch (error: any) {
    console.error(
      "[portfolio-presign]",
      {
        name:
          error?.name,
        message:
          error?.message,
      },
    );

    const message =
      String(
        error?.message ||
          "PRESIGN_FAILED",
      );

    const status =
      message ===
      "UNAUTHENTICATED"
        ? 401
        : message ===
            "FORBIDDEN"
          ? 403
          : 500;

    return Response.json(
      {
        error:
          status === 500
            ? "PRESIGN_FAILED"
            : message,
        detail:
          status === 500
            ? message
            : undefined,
      },
      { status },
    );
  }
}
