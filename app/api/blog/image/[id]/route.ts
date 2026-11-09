import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  can,
  currentUser,
  PERMISSIONS,
} from "@/lib/auth-v7";
import { getStoredFile } from "@/lib/storage";

function isPublicArticle(article: {
  status: string;
  scheduledAt: Date | null;
}) {
  if (article.status === "PUBLISHED") return true;

  return (
    article.status === "SCHEDULED" &&
    article.scheduledAt !== null &&
    article.scheduledAt.getTime() <= Date.now()
  );
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await params;

    const article = await prisma.blogArticle.findUnique({
      where: { id },
      select: {
        status: true,
        scheduledAt: true,
        visualStoragePath: true,
      },
    });

    if (!article?.visualStoragePath) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const publicVisible = isPublicArticle(article);

    if (!publicVisible) {
      const user = await currentUser();

      const authorized =
        Boolean(user) &&
        can(
          user!.role,
          PERMISSIONS.BLOG_MANAGE,
          user!.permissions,
        );

      if (!authorized) {
        return NextResponse.json(
          { error: "NOT_FOUND" },
          { status: 404 },
        );
      }
    }

    const stored = await getStoredFile(
      article.visualStoragePath,
    );

    return new Response(stored.stream, {
      headers: {
        "Content-Type":
          stored.blob.contentType ||
          "application/octet-stream",
        "Cache-Control": publicVisible
          ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
          : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    const message = String(
      error?.message || "FAILED",
    );

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "STORAGE_NOT_CONFIGURED"
            ? 503
            : 500,
      },
    );
  }
}
