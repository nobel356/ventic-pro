import type { Metadata } from "next";
import PortfolioGallery from "@/app/shared/PortfolioGallery";
import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute:
      "أعمال Ventic Pro | تركيب هود وتهوية فعلية",
  },
  description:
    "شاهد أعمال Ventic Pro الحقيقية في تركيب الهود وخطوط الطرد وتهوية الحمامات والمطابخ، مع فيديوهات منشورة بموافقة العميل.",
  alternates: {
    canonical: "/works",
  },
  openGraph: {
    title:
      "أعمال Ventic Pro | تركيب هود وتهوية فعلية",
    description:
      "فيديوهات من تنفيذات Ventic Pro الحقيقية في التهوية والهود وخطوط الطرد.",
    url: "/works",
    type: "website",
  },
};

type WorkRow = {
  id: string;
  title: string;
  caption: string | null;
  location: string | null;
  serviceType: string | null;
  blobPathname: string;
  publishedAt: Date | null;
  createdAt: Date;
};

function publicVideoUrl(
  pathname: string,
) {
  if (
    pathname.startsWith(
      "youtube:",
    )
  ) {
    const id =
      pathname.slice(
        "youtube:".length,
      );

    return {
      url:
        `https://www.youtube.com/watch?v=${encodeURIComponent(
          id,
        )}`,
      embedUrl:
        `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          id,
        )}`,
    };
  }

  if (
    pathname.startsWith(
      "tiktok:",
    )
  ) {
    const id =
      pathname.slice(
        "tiktok:".length,
      );

    return {
      url:
        `https://www.tiktok.com/@ventic.pro6/video/${encodeURIComponent(
          id,
        )}`,
      embedUrl:
        `https://www.tiktok.com/player/v1/${encodeURIComponent(
          id,
        )}`,
    };
  }

  return null;
}

export default async function WorksPage() {
  const works =
    await prisma.$queryRaw<
      WorkRow[]
    >`
      SELECT
        "id",
        "title",
        "caption",
        "location",
        "serviceType",
        "blobPathname",
        "publishedAt",
        "createdAt"
      FROM "PortfolioVideo"
      WHERE "isPublished" = true
        AND "customerConsent" = true
        AND (
          "blobPathname" LIKE 'youtube:%'
          OR "blobPathname" LIKE 'tiktok:%'
        )
      ORDER BY
        "sortOrder" ASC,
        "publishedAt" DESC NULLS LAST,
        "createdAt" DESC
      LIMIT 30
    `;

  const baseUrl =
    (
      process.env
        .NEXT_PUBLIC_APP_URL ||
      "https://ventic-pro.com"
    ).replace(/\/$/, "");

  const itemList =
    works
      .map(
        (work, index) => {
          const video =
            publicVideoUrl(
              work.blobPathname,
            );

          if (!video) {
            return null;
          }

          return {
            "@type":
              "ListItem",
            position:
              index + 1,
            item: {
              "@type":
                "VideoObject",
              name:
                work.title,
              description:
                work.caption ||
                work.serviceType ||
                work.title,
              thumbnailUrl:
                `${baseUrl}/social-preview.png`,
              uploadDate:
                (
                  work.publishedAt ||
                  work.createdAt
                ).toISOString(),
              contentUrl:
                video.url,
              embedUrl:
                video.embedUrl,
              url:
                `${baseUrl}/works`,
              ...(work.location
                ? {
                    contentLocation:
                      {
                        "@type":
                          "Place",
                        name:
                          work.location,
                      },
                  }
                : {}),
            },
          };
        },
      )
      .filter(Boolean);

  const schema = {
    "@context":
      "https://schema.org",
    "@type":
      "CollectionPage",
    "@id":
      `${baseUrl}/works#portfolio`,
    url:
      `${baseUrl}/works`,
    name:
      "أعمال Ventic Pro",
    inLanguage:
      "ar-EG",
    mainEntity: {
      "@type":
        "ItemList",
      itemListElement:
        itemList,
    },
  };

  return (
    <main
      style={{
        minHeight: "70vh",
        paddingTop: 28,
        paddingBottom: 40,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              schema,
            ),
        }}
      />

      <PortfolioGallery filters />
    </main>
  );
}
