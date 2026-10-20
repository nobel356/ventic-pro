import { issueSignedToken, presignUrl } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

type Row = {
  id: string;
  title: string;
  caption: string | null;
  location: string | null;
  serviceType: string | null;
  blobUrl: string;
  blobPathname: string;
  sortOrder: number;
};

async function signedReadUrl(pathname: string) {
  const validUntil = Date.now() + 60 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const result = await presignUrl(token, { pathname, operation: "get", access: "private", validUntil });
  return result.presignedUrl;
}

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT "id","title","caption","location","serviceType","blobUrl","blobPathname","sortOrder"
      FROM "PortfolioVideo"
      WHERE "isPublished" = true AND "customerConsent" = true
      ORDER BY "sortOrder" ASC, "publishedAt" DESC NULLS LAST, "createdAt" DESC
      LIMIT 60
    `;

    const items = await Promise.all(rows.map(async (item) => {
      if (item.blobPathname.startsWith("youtube:")) return item;
      return { ...item, blobUrl: await signedReadUrl(item.blobPathname) };
    }));

    return Response.json({ items }, { headers: { "Cache-Control": "private, max-age=120" } });
  } catch (error: any) {
    console.error("[portfolio-videos-public]", error?.message);
    return Response.json({ items: [], error: "PORTFOLIO_VIDEO_READ_FAILED" }, { status: 500 });
  }
}
