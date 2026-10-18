import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-v7";
import { deleteStoredFile } from "@/lib/storage";

type PortfolioVideoRow = {
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

function validBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith("blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
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

export async function GET() {
  try {
    await auth();

    const items = await prisma.$queryRaw<PortfolioVideoRow[]>`
      SELECT *
      FROM "PortfolioVideo"
      ORDER BY "sortOrder" ASC, "createdAt" DESC
    `;

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

    if (!validBlobUrl(blobUrl)) {
      return Response.json({ error: "INVALID_BLOB_URL" }, { status: 400 });
    }

    if (isPublished && !customerConsent) {
      return Response.json(
        { error: "CUSTOMER_CONSENT_REQUIRED" },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const publishedAt = isPublished ? new Date() : null;

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
        ${user.name || user.email || "Super Admin"},
        NOW(),
        NOW()
      )
    `;

    return Response.json({ ok: true, id });
  } catch (error: any) {
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

    const rows = await prisma.$queryRaw<PortfolioVideoRow[]>`
      SELECT *
      FROM "PortfolioVideo"
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

    const rows = await prisma.$queryRaw<PortfolioVideoRow[]>`
      SELECT *
      FROM "PortfolioVideo"
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

    await deleteStoredFile(current.blobPathname);

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "FAILED" },
      { status: error?.status || 500 },
    );
  }
}
