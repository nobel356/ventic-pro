import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import {
  deleteStoredFile,
  uploadBlogImage,
} from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(
      PERMISSIONS.BLOG_MANAGE,
    );

    const form = await request.formData();
    const articleId = String(
      form.get("articleId") || "",
    ).trim();
    const file = form.get("file");

    if (!articleId || !(file instanceof File)) {
      return NextResponse.json(
        { error: "ARTICLE_AND_FILE_REQUIRED" },
        { status: 400 },
      );
    }

    const article = await prisma.blogArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const uploaded = await uploadBlogImage({
      articleId,
      file,
    });

    const oldStoragePath =
      article.visualStoragePath;

    await prisma.blogArticle.update({
      where: { id: articleId },
      data: {
        visualStoragePath: uploaded.pathname,
        visualPath:
          "/api/blog/image/" +
          encodeURIComponent(article.id),
        updatedByLabel:
          actor.name || actor.email,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "BLOG_IMAGE_UPDATED",
        oldValue: {
          visualPath: article.visualPath,
          visualStoragePath:
            article.visualStoragePath,
        },
        newValue: {
          visualPath:
            "/api/blog/image/" +
            article.id,
          contentType: uploaded.contentType,
          size: uploaded.size,
        },
      },
    });

    if (
      oldStoragePath &&
      oldStoragePath !== uploaded.pathname
    ) {
      await deleteStoredFile(oldStoragePath);
    }

    return NextResponse.json({
      ok: true,
      visualPath:
        "/api/blog/image/" +
        encodeURIComponent(article.id),
    });
  } catch (error: any) {
    const message = String(
      error?.message || "FAILED",
    );

    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : message === "INVALID_BLOG_IMAGE"
            ? 400
            : message === "IMAGE_TOO_LARGE"
              ? 413
              : message === "STORAGE_NOT_CONFIGURED"
                ? 503
                : 500;

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
