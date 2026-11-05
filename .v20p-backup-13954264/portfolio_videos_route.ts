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

export async function GET() {
  try {
    const items = await prisma.$queryRaw<Row[]>`
      SELECT
        "id",
        "title",
        "caption",
        "location",
        "serviceType",
        "blobUrl",
        "blobPathname",
        "sortOrder"
      FROM "PortfolioVideo"
      WHERE "isPublished" = true
        AND "customerConsent" = true
        AND (
          "blobPathname" LIKE 'youtube:%'
          OR "blobPathname" LIKE 'tiktok:%'
        )
      ORDER BY "sortOrder" ASC, "publishedAt" DESC NULLS LAST, "createdAt" DESC
      LIMIT 60
    `;

    return Response.json(
      { items },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (error: any) {
    console.error("[portfolio-public]", error?.message);

    return Response.json(
      {
        items: [],
        error: "PORTFOLIO_VIDEO_READ_FAILED",
      },
      { status: 500 },
    );
  }
}
