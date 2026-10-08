import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-v7";
import { parseAttribution } from "@/lib/marketing-analytics";
import MarketingSpendManager from "./MarketingSpendManager";

export const dynamic =
  "force-dynamic";

export default async function MarketingSpendPage() {
  const user =
    await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (
    user.role !==
    "SUPER_ADMIN"
  ) {
    redirect("/admin");
  }

  const [orders, leads] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          acquisitionSource: {
            not: null,
          },
        },
        select: {
          acquisitionSource:
            true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 300,
      }),
      prisma.lead.findMany({
        where: {
          source: {
            not: null,
          },
        },
        select: {
          source: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 300,
      }),
    ]);

  const parsed = [
    ...orders.map(
      (item) =>
        parseAttribution(
          item.acquisitionSource,
        ),
    ),
    ...leads.map(
      (item) =>
        parseAttribution(
          item.source,
        ),
    ),
  ];

  const sources = [
    "Facebook",
    "Instagram",
    "TikTok",
    "Google",
    "WhatsApp",
    "Referral",
    "Organic",
    ...parsed.map(
      (item) =>
        item.source,
    ),
  ]
    .filter(Boolean)
    .filter(
      (
        value,
        index,
        array,
      ) =>
        array.indexOf(
          value,
        ) === index,
    )
    .sort((a, b) =>
      a.localeCompare(
        b,
        "ar",
      ),
    );

  const campaigns =
    parsed
      .filter(
        (item) =>
          item.campaign,
      )
      .map((item) => ({
        source:
          item.source,
        campaign:
          item.campaign,
      }))
      .filter(
        (
          item,
          index,
          array,
        ) =>
          array.findIndex(
            (candidate) =>
              candidate.source ===
                item.source &&
              candidate.campaign ===
                item.campaign,
          ) === index,
      );

  return (
    <main
      className="admin"
      dir="rtl"
    >
      <section
        style={{
          maxWidth: 1250,
          margin: "0 auto",
          padding:
            "26px 18px 70px",
        }}
      >
        <h1
          style={{
            marginBottom: 6,
          }}
        >
          تكلفة الإعلانات
        </h1>
        <p
          style={{
            color: "#64748b",
            marginTop: 0,
            lineHeight: 1.8,
          }}
        >
          سجل المبلغ الفعلي الذي تم صرفه على كل مصدر أو حملة. السجلات لا يتم حذفها فعليًا؛ الإلغاء يُسجل في الـAudit Log للحفاظ على التاريخ.
        </p>

        <MarketingSpendManager
          sources={sources}
          campaigns={
            campaigns
          }
        />
      </section>
    </main>
  );
}
