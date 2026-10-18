import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { requireSuperAdmin } from "@/lib/auth-v7";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
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
        // Metadata is saved explicitly by the admin page after the direct upload.
      },
    });

    return Response.json(response);
  } catch (error: any) {
    const message =
      error?.message === "UNAUTHENTICATED"
        ? "UNAUTHENTICATED"
        : error?.message === "FORBIDDEN"
          ? "FORBIDDEN"
          : "UPLOAD_TOKEN_FAILED";

    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 400;

    return Response.json({ error: message }, { status });
  }
}
