import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { requireSuperAdmin } from "@/lib/auth-v7";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        await requireSuperAdmin();

        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            purpose: "portfolio-video",
          }),
        };
      },
      onUploadCompleted: async () => {
        // Metadata is saved by the admin page after the direct upload completes.
      },
    });

    return Response.json(response);
  } catch (error: any) {
    console.error("[portfolio-video-upload-token]", {
      name: error?.name,
      message: error?.message,
    });

    const message = String(error?.message || "UPLOAD_TOKEN_FAILED");

    if (message === "UNAUTHENTICATED") {
      return Response.json({ error: message }, { status: 401 });
    }

    if (message === "FORBIDDEN") {
      return Response.json({ error: message }, { status: 403 });
    }

    return Response.json(
      {
        error: "UPLOAD_TOKEN_FAILED",
        detail: message,
      },
      { status: 400 },
    );
  }
}
