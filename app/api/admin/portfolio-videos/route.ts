import crypto from "crypto";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-v7";
import { deleteStoredFile } from "@/lib/storage";

type Row = {
  id: string;
  title: string;
  caption: string | null;
  location: string | null;
  serviceType: string | null;
  blobUrl: string;
  blobPathname: string;
  sortOrder: number;
  customerConsent: boolean;
  isPublished: boolean;
  publishedAt: Date | null;
  createdByLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function clean(value: unknown, max = 300) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

async function auth() {
  try {
    return await requireSuperAdmin();
  } catch (error: any) {
    const message = error?.message || "FORBIDDEN";
    const status = message === "UNAUTHENTICATED" ? 401 : 403;
    throw Object.assign(new Error(message), { status });
  }
}

async function signedReadUrl(pathname: string) {
  const validUntil = Date.now() + 60 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const result = await presignUrl(token, {
    pathname,
    operation: "get",
    access: "private",
    validUntil,
  });
  return result.presignedUrl;
}

export async function GET() {
  try {
    await auth();

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT * FROM "PortfolioVideo"
      ORDER BY "sortOrder" ASC, "createdAt" DESC
    `;

    const items = await Promise.all(
      rows.map(async (item) => {
        if (item.blobPathname.startsWith("youtube:")) return item;
        return {
          ...item,
          blobUrl: await signedReadUrl(item.blobPathname),
        };
      }),
    );

    return Response.json({ items });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "FAILED" },
      { status: error?.status || 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await auth();
    const body = await request.json();

    const title = clean(body?.title, 120);
    const caption = clean(body?.caption, 700);
    const location = clean(body?.location, 120);
    const serviceType = clean(body?.serviceType, 120);
    const blobUrl = String(body?.blobUrl || "").trim();
    const blobPathname = String(body?.blobPathname || "").trim();

    const sortOrder = Number.isFinite(Number(body?.sortOrder))
      ? Math.max(-9999, Math.min(9999, Number(body.sortOrder)))
      : 0;

    const customerConsent = Boolean(body?.customerConsent);
    const isPublished = Boolean(body?.isPublished);

    if (!title || !blobUrl || !blobPathname) {
      return Response.json(
        { error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 },
      );
    }

    if (blobPathname.startsWith("youtube:")) {
      const videoId = blobPathname.slice("youtube:".length);

      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        return Response.json(
          { error: "INVALID_YOUTUBE_VIDEO_ID" },
          { status: 400 },
        );
      }
    }

    if (isPublished && !customerConsent) {
      return Response.json(
        { error: "CUSTOMER_CONSENT_REQUIRED" },
        { status: 400 },
      );
    }

    const publishedAt = isPublished ? new Date() : null;
    const creator = user.name || user.email || "Super Admin";

    const existingRows = await prisma.$queryRaw<Row[]>`
      SELECT *
      FROM "PortfolioVideo"
      WHERE "blobPathname" = ${blobPathname}
      LIMIT 1
    `;

    const existing = existingRows[0];

    if (existing) {
      const nextPublishedAt =
        isPublished
          ? existing.publishedAt || publishedAt || new Date()
          : null;

      await prisma.$executeRaw`
        UPDATE "PortfolioVideo"
        SET
          "title" = ${title},
          "caption" = ${caption},
          "location" = ${location},
          "serviceType" = ${serviceType},
          "blobUrl" = ${blobUrl},
          "sortOrder" = ${sortOrder},
          "customerConsent" = ${customerConsent},
          "isPublished" = ${isPublished},
          "publishedAt" = ${nextPublishedAt},
          "updatedAt" = NOW()
        WHERE "id" = ${existing.id}
      `;

      return Response.json({
        ok: true,
        id: existing.id,
        updatedExisting: true,
      });
    }

    const id = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "PortfolioVideo" (
        "id",
        "title",
        "caption",
        "location",
        "serviceType",
        "blobUrl",
        "blobPathname",
        "sortOrder",
        "customerConsent",
        "isPublished",
        "publishedAt",
        "createdByLabel",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${title},
        ${caption},
        ${location},
        ${serviceType},
        ${blobUrl},
        ${blobPathname},
        ${sortOrder},
        ${customerConsent},
        ${isPublished},
        ${publishedAt},
        ${creator},
        NOW(),
        NOW()
      )
    `;

    return Response.json({
      ok: true,
      id,
      updatedExisting: false,
    });
  } catch (error: any) {
    if (
      error?.code === "P2010" &&
      String(error?.meta?.code || "") === "23505"
    ) {
      return Response.json(
        {
          error: "VIDEO_ALREADY_EXISTS",
          message: "الفيديو موجود بالفعل في أعمالنا.",
        },
        { status: 409 },
      );
    }

    return Response.json(
      { error: error?.message || "FAILED" },
      { status: error?.status || 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await auth();

    const body = await request.json();
    const id = String(body?.id || "").trim();

    if (!id) {
      return Response.json({ error: "ID_REQUIRED" }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT * FROM "PortfolioVideo"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    const current = rows[0];

    if (!current) {
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const title = clean(body?.title ?? current.title, 120) || current.title;
    const caption = clean(body?.caption ?? current.caption, 700);
    const location = clean(body?.location ?? current.location, 120);
    const serviceType = clean(body?.serviceType ?? current.serviceType, 120);

    const sortOrder = Number.isFinite(Number(body?.sortOrder))
      ? Math.max(-9999, Math.min(9999, Number(body.sortOrder)))
      : current.sortOrder;

    const customerConsent =
      typeof body?.customerConsent === "boolean"
        ? body.customerConsent
        : current.customerConsent;

    const isPublished =
      typeof body?.isPublished === "boolean"
        ? body.isPublished
        : current.isPublished;

    if (isPublished && !customerConsent) {
      return Response.json(
        { error: "CUSTOMER_CONSENT_REQUIRED" },
        { status: 400 },
      );
    }

    const publishedAt =
      isPublished && !current.isPublished
        ? new Date()
        : isPublished
          ? current.publishedAt
          : null;

    await prisma.$executeRaw`
      UPDATE "PortfolioVideo"
      SET
        "title" = ${title},
        "caption" = ${caption},
        "location" = ${location},
        "serviceType" = ${serviceType},
        "sortOrder" = ${sortOrder},
        "customerConsent" = ${customerConsent},
        "isPublished" = ${isPublished},
        "publishedAt" = ${publishedAt},
        "updatedAt" = NOW()
      WHERE "id" = ${id}
    `;

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "FAILED" },
      { status: error?.status || 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await auth();

    const body = await request.json();
    const id = String(body?.id || "").trim();

    if (!id) {
      return Response.json({ error: "ID_REQUIRED" }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT * FROM "PortfolioVideo"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    const current = rows[0];

    if (!current) {
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.$executeRaw`
      DELETE FROM "PortfolioVideo"
      WHERE "id" = ${id}
    `;

    if (!current.blobPathname.startsWith("youtube:")) {
      await deleteStoredFile(current.blobPathname);
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "FAILED" },
      { status: error?.status || 500 },
    );
  }
}
