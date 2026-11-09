import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function safeSlug(value: unknown) {
  return clean(value, 100)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function jsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

async function auth() {
  return requirePermission(PERMISSIONS.BLOG_MANAGE);
}

export async function GET() {
  try {
    await auth();

    const items = await prisma.blogArticle.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { updatedAt: "desc" },
      ],
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "FAILED" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await auth();
    const body = await request.json();

    const title = clean(body?.title, 220);
    const slug = safeSlug(body?.slug || title);
    const description = clean(body?.description, 500);
    const excerpt = clean(body?.excerpt, 600);
    const category = clean(body?.category, 80);
    const status = body?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    const readingMinutes = Math.max(
      1,
      Math.min(60, Number(body?.readingMinutes) || 5),
    );
    const serviceHref = clean(body?.serviceHref, 220) || "/order";
    const serviceLabel = clean(body?.serviceLabel, 120) || "اطلب الخدمة";
    const visualPath = clean(body?.visualPath, 300) || null;
    const seoTitle = clean(body?.seoTitle, 220) || null;
    const seoDescription = clean(body?.seoDescription, 500) || null;
    const sortOrder = Math.max(
      -9999,
      Math.min(9999, Number(body?.sortOrder) || 0),
    );

    if (!title || !slug || !description || !excerpt || !category) {
      return NextResponse.json(
        { error: "الحقول الأساسية مطلوبة" },
        { status: 400 },
      );
    }

    const saved = await prisma.blogArticle.create({
      data: {
        slug,
        title,
        description,
        excerpt,
        category,
        status,
        readingMinutes,
        serviceHref,
        serviceLabel,
        sections: jsonArray(body?.sections),
        faq: jsonArray(body?.faq),
        sources: jsonArray(body?.sources),
        visualPath,
        seoTitle,
        seoDescription,
        sortOrder,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        createdByLabel: actor.name || actor.email,
        updatedByLabel: actor.name || actor.email,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "BLOG_ARTICLE_CREATED",
        newValue: {
          id: saved.id,
          slug: saved.slug,
          title: saved.title,
          status: saved.status,
        },
      },
    });

    return NextResponse.json({ ok: true, id: saved.id });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "الرابط المختصر مستخدم بالفعل" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error?.message || "FAILED" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await auth();
    const body = await request.json();
    const id = clean(body?.id, 120);

    if (!id) {
      return NextResponse.json(
        { error: "ID_REQUIRED" },
        { status: 400 },
      );
    }

    const current = await prisma.blogArticle.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const nextStatus =
      body?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

    const nextSlug = safeSlug(body?.slug || current.slug);

    if (
      current.publishedAt &&
      nextSlug !== current.slug
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكن تغيير Slug بعد أول نشر حفاظًا على SEO. أنشئ مقالًا جديدًا أو أضف Redirect مخططًا.",
        },
        { status: 400 },
      );
    }

    const saved = await prisma.blogArticle.update({
      where: { id },
      data: {
        slug: nextSlug,
        title: clean(body?.title ?? current.title, 220) || current.title,
        description:
          clean(body?.description ?? current.description, 500) ||
          current.description,
        excerpt:
          clean(body?.excerpt ?? current.excerpt, 600) ||
          current.excerpt,
        category:
          clean(body?.category ?? current.category, 80) ||
          current.category,
        status: nextStatus,
        readingMinutes: Math.max(
          1,
          Math.min(60, Number(body?.readingMinutes) || current.readingMinutes),
        ),
        serviceHref:
          clean(body?.serviceHref ?? current.serviceHref, 220) ||
          current.serviceHref,
        serviceLabel:
          clean(body?.serviceLabel ?? current.serviceLabel, 120) ||
          current.serviceLabel,
        sections: jsonArray(body?.sections ?? current.sections),
        faq: jsonArray(body?.faq ?? current.faq),
        sources: jsonArray(body?.sources ?? current.sources),
        visualPath:
          clean(body?.visualPath ?? current.visualPath, 300) || null,
        seoTitle:
          clean(body?.seoTitle ?? current.seoTitle, 220) || null,
        seoDescription:
          clean(body?.seoDescription ?? current.seoDescription, 500) || null,
        sortOrder: Math.max(
          -9999,
          Math.min(9999, Number(body?.sortOrder) || current.sortOrder),
        ),
        publishedAt:
          nextStatus === "PUBLISHED"
            ? current.publishedAt || new Date()
            : null,
        updatedByLabel: actor.name || actor.email,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "BLOG_ARTICLE_UPDATED",
        oldValue: {
          id: current.id,
          slug: current.slug,
          title: current.title,
          status: current.status,
        },
        newValue: {
          id: saved.id,
          slug: saved.slug,
          title: saved.title,
          status: saved.status,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "الرابط المختصر مستخدم بالفعل" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error?.message || "FAILED" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await auth();
    const body = await request.json();
    const id = clean(body?.id, 120);

    if (!id) {
      return NextResponse.json(
        { error: "ID_REQUIRED" },
        { status: 400 },
      );
    }

    const current = await prisma.blogArticle.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (current.status === "PUBLISHED") {
      return NextResponse.json(
        {
          error:
            "لا يمكن حذف مقال منشور مباشرة. حوّله إلى Draft أولًا.",
        },
        { status: 400 },
      );
    }

    await prisma.blogArticle.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "BLOG_ARTICLE_DELETED",
        oldValue: {
          id: current.id,
          slug: current.slug,
          title: current.title,
          status: current.status,
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
