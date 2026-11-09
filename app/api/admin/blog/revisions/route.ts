import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

async function auth() {
  return requirePermission(PERMISSIONS.BLOG_MANAGE);
}

export async function GET(request: Request) {
  try {
    await auth();

    const articleId =
      new URL(request.url).searchParams.get(
        "articleId",
      ) || "";

    if (!articleId) {
      return NextResponse.json(
        { error: "ARTICLE_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const items =
      await prisma.blogArticleRevision.findMany({
        where: { articleId },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await auth();
    const body = await request.json();

    const articleId = String(
      body?.articleId || "",
    ).trim();
    const revisionId = String(
      body?.revisionId || "",
    ).trim();

    if (!articleId || !revisionId) {
      return NextResponse.json(
        { error: "IDS_REQUIRED" },
        { status: 400 },
      );
    }

    const [article, revision] =
      await Promise.all([
        prisma.blogArticle.findUnique({
          where: { id: articleId },
        }),
        prisma.blogArticleRevision.findUnique({
          where: { id: revisionId },
        }),
      ]);

    if (
      !article ||
      !revision ||
      revision.articleId !== articleId
    ) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const snapshot = revision.snapshot as any;

    await prisma.blogArticleRevision.create({
      data: {
        articleId,
        snapshot: {
          slug: article.slug,
          title: article.title,
          description: article.description,
          excerpt: article.excerpt,
          category: article.category,
          status: article.status,
          readingMinutes: article.readingMinutes,
          serviceHref: article.serviceHref,
          serviceLabel: article.serviceLabel,
          sections: article.sections,
          faq: article.faq,
          sources: article.sources,
          visualPath: article.visualPath,
          visualStoragePath:
            article.visualStoragePath,
          seoTitle: article.seoTitle,
          seoDescription:
            article.seoDescription,
          sortOrder: article.sortOrder,
          publishedAt: article.publishedAt,
          scheduledAt: article.scheduledAt,
        },
        createdByLabel:
          actor.name || actor.email,
      },
    });

    await prisma.blogArticle.update({
      where: { id: articleId },
      data: {
        title: snapshot.title,
        description: snapshot.description,
        excerpt: snapshot.excerpt,
        category: snapshot.category,
        status: snapshot.status,
        readingMinutes:
          snapshot.readingMinutes,
        serviceHref: snapshot.serviceHref,
        serviceLabel: snapshot.serviceLabel,
        sections: snapshot.sections,
        faq: snapshot.faq,
        sources: snapshot.sources,
        visualPath: snapshot.visualPath,
        visualStoragePath:
          snapshot.visualStoragePath,
        seoTitle: snapshot.seoTitle,
        seoDescription:
          snapshot.seoDescription,
        sortOrder: snapshot.sortOrder,
        scheduledAt: snapshot.scheduledAt
          ? new Date(snapshot.scheduledAt)
          : null,
        publishedAt: snapshot.publishedAt
          ? new Date(snapshot.publishedAt)
          : null,
        updatedByLabel:
          actor.name || actor.email,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "BLOG_REVISION_RESTORED",
        newValue: {
          articleId,
          revisionId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "FAILED" },
      { status: 500 },
    );
  }
}
