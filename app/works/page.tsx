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
      <section
        dir="rtl"
        style={{
          maxWidth: 1120,
          margin: "0 auto 24px",
          padding: "48px 18px 0",
        }}
      >
        <span
          style={{
            color: "#0284c7",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          أعمال حقيقية بموافقة العميل
        </span>

        <h1
          style={{
            color: "#071a2b",
            fontSize: "clamp(34px,6vw,52px)",
            margin: "7px 0 10px",
          }}
        >
          تنفيذات تهوية حقيقية من Ventic Pro
        </h1>

        <p
          style={{
            color: "#475569",
            lineHeight: 1.9,
            maxWidth: 860,
          }}
        >
          هنا بنعرض أمثلة فعلية من شغل التهوية والهود وخطوط الطرد بعد موافقة أصحابها على النشر.
          الهدف مش عرض فيديو وخلاص؛ شوف نوع المشكلة، مكان التنفيذ وطبيعة المسار قبل ما تقارن حالتك
          بمشروع تاني. كل مطبخ أو حمام له طول دكت وعدد أكواع وفتحة خروج وتجهيز كهرباء مختلف، لذلك
          الفيديو يساعدك تفهم شكل التنفيذ لكنه لا يعتبر مقايسة أو سعرًا ثابتًا لحالتك.
        </p>

        <p
          style={{
            color: "#64748b",
            lineHeight: 1.9,
            maxWidth: 860,
          }}
        >
          قبل التنفيذ بنراجع صور المكان ومقاس الفتحات ومسار الطرد وإمكانية الوصول للصيانة. وبعد التركيب
          يتم توثيق الطلب والفاتورة والضمان داخل النظام. لو شفت تنفيذ قريب من احتياجك، استخدمه كمرجع
          بصري ثم ارفع صور مكانك في الطلب عشان تتراجع الحالة نفسها بدل نسخ حل من مكان مختلف.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 10,
            marginTop: 16,
          }}
        >
          {[
            ["هود وخطوط طرد", "راجع اتجاه المسار والأكواع وفتحة الخروج."],
            ["تهوية حمامات", "قارن مكان الشفاط وطول الدكت وإمكانية الصيانة."],
            ["تنفيذ موثق", "الفيديوهات المعروضة مرتبطة بأعمال حقيقية منشورة بموافقة العميل."],
          ].map(([title, text]) => (
            <article
              key={title}
              style={{
                background: "white",
                border: "1px solid #dbe7ef",
                borderRadius: 14,
                padding: 14,
              }}
            >
              <strong style={{ color: "#0b2f49" }}>{title}</strong>
              <p style={{ color: "#64748b", lineHeight: 1.7, marginBottom: 0 }}>
                {text}
              </p>
            </article>
          ))}
        </div>
      </section>

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
