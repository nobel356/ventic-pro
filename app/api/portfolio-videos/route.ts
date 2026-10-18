import { prisma } from "@/lib/prisma";

type PublicPortfolioVideo = {
  id: string;
  title: string;
  caption: string | null;
  location: string | null;
  serviceType: string | null;
  blobUrl: string;
  sortOrder: number;
};

export async function GET() {
  const items = await prisma.$queryRaw<PublicPortfolioVideo[]>`
    SELECT
      "id",
      "title",
      "caption",
      "location",
      "serviceType",
      "blobUrl",
      "sortOrder"
    FROM "PortfolioVideo"
    WHERE "isPublished" = true
      AND "customerConsent" = true
    ORDER BY "sortOrder" ASC, "publishedAt" DESC NULLS LAST, "createdAt" DESC
    LIMIT 60
  `;

  return Response.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
