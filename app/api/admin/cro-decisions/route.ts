import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import {
  summarizeExperiment,
} from "@/lib/cro-experiments";

function clean(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

function revisionSnapshot(article: any) {
  return {
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
    visualStoragePath: article.visualStoragePath,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    sortOrder: article.sortOrder,
    publishedAt: article.publishedAt,
    scheduledAt: article.scheduledAt,
  };
}

async function metrics(experimentId: string) {
  const [
    controlExposures,
    controlClicks,
    variantExposures,
    variantClicks,
    controlOrders,
    variantOrders,
  ] = await Promise.all([
    prisma.croEvent.count({
      where: {
        experimentId,
        variant: "CONTROL",
        eventType: "EXPOSURE",
      },
    }),
    prisma.croEvent.count({
      where: {
        experimentId,
        variant: "CONTROL",
        eventType: "CLICK",
      },
    }),
    prisma.croEvent.count({
      where: {
        experimentId,
        variant: "VARIANT",
        eventType: "EXPOSURE",
      },
    }),
    prisma.croEvent.count({
      where: {
        experimentId,
        variant: "VARIANT",
        eventType: "CLICK",
      },
    }),
    prisma.order.count({
      where: {
        attributionContent:
          "cro:" +
          experimentId +
          ":CONTROL",
      },
    }),
    prisma.order.count({
      where: {
        attributionContent:
          "cro:" +
          experimentId +
          ":VARIANT",
      },
    }),
  ]);

  return {
    controlExposures,
    controlClicks,
    controlOrders,
    variantExposures,
    variantClicks,
    variantOrders,
    ...summarizeExperiment({
      controlExposures,
      controlClicks,
      controlOrders,
      variantExposures,
      variantClicks,
      variantOrders,
    }),
  };
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(
      PERMISSIONS.BLOG_MANAGE,
    );

    const body = await request.json();
    const id = clean(body?.id, 120);
    const action = clean(body?.action, 40);
    const note = clean(body?.note, 1000) || null;

    const experiment =
      await prisma.croExperiment.findUnique({
        where: { id },
      });

    if (!experiment) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (action === "ADOPT_WINNER") {
      if (experiment.status !== "STOPPED") {
        return NextResponse.json(
          {
            error:
              "لازم توقف التجربة أولًا قبل اعتماد الفائز.",
          },
          { status: 400 },
        );
      }

      const result = await metrics(id);

      if (
        !result.enoughSample ||
        !result.significant ||
        !result.winner
      ) {
        return NextResponse.json(
          {
            error:
              "التجربة غير مؤهلة لاعتماد Winner: لازم العينة تكون كافية وp-value أقل من 0.05.",
          },
          { status: 400 },
        );
      }

      const article =
        await prisma.blogArticle.findUnique({
          where: {
            slug: experiment.articleSlug,
          },
        });

      if (!article) {
        return NextResponse.json(
          {
            error: "ARTICLE_NOT_FOUND",
          },
          { status: 404 },
        );
      }

      const winnerLabel =
        result.winner === "VARIANT"
          ? experiment.variantLabel
          : experiment.controlLabel;

      await prisma.$transaction(async (tx) => {
        await tx.blogArticleRevision.create({
          data: {
            articleId: article.id,
            snapshot: revisionSnapshot(article),
            createdByLabel:
              actor.name || actor.email,
          },
        });

        await tx.blogArticle.update({
          where: { id: article.id },
          data: {
            serviceLabel: winnerLabel,
            updatedByLabel:
              actor.name || actor.email,
          },
        });

        await tx.croExperiment.update({
          where: { id },
          data: {
            status: "ROLLED_OUT",
            decision: result.winner,
            decisionNote: note,
            decidedAt: new Date(),
            decidedByLabel:
              actor.name || actor.email,
            previousServiceLabel:
              article.serviceLabel,
            appliedServiceLabel:
              winnerLabel,
            rolledOutAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            actorLabel: actor.name,
            action:
              "CRO_WINNER_ROLLED_OUT",
            oldValue: {
              experimentId: id,
              articleSlug:
                experiment.articleSlug,
              serviceLabel:
                article.serviceLabel,
            },
            newValue: {
              winner: result.winner,
              serviceLabel:
                winnerLabel,
              pValue:
                result.pValue,
              controlCtr:
                result.controlCtr,
              variantCtr:
                result.variantCtr,
            },
          },
        });
      });

      return NextResponse.json({
        ok: true,
        winner: result.winner,
        label: winnerLabel,
      });
    }

    if (action === "RECORD_NO_WINNER") {
      if (experiment.status !== "STOPPED") {
        return NextResponse.json(
          {
            error:
              "لازم توقف التجربة أولًا.",
          },
          { status: 400 },
        );
      }

      const result = await metrics(id);

      if (
        result.significant &&
        result.winner
      ) {
        return NextResponse.json(
          {
            error:
              "التجربة عندها Winner مؤهل بالفعل. لا تسجلها No Winner.",
          },
          { status: 400 },
        );
      }

      await prisma.croExperiment.update({
        where: { id },
        data: {
          status: "DECIDED",
          decision: "NO_WINNER",
          decisionNote: note,
          decidedAt: new Date(),
          decidedByLabel:
            actor.name || actor.email,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action:
            "CRO_NO_WINNER_RECORDED",
          newValue: {
            experimentId: id,
            articleSlug:
              experiment.articleSlug,
            pValue: result.pValue,
            controlCtr:
              result.controlCtr,
            variantCtr:
              result.variantCtr,
          },
        },
      });

      return NextResponse.json({
        ok: true,
      });
    }

    if (action === "ROLLBACK") {
      if (experiment.status !== "ROLLED_OUT") {
        return NextResponse.json(
          {
            error:
              "Rollback متاح فقط لتجربة Rolled Out.",
          },
          { status: 400 },
        );
      }

      if (
        !experiment.previousServiceLabel ||
        !experiment.appliedServiceLabel
      ) {
        return NextResponse.json(
          {
            error:
              "بيانات الـrollout القديمة غير مكتملة.",
          },
          { status: 400 },
        );
      }

      const article =
        await prisma.blogArticle.findUnique({
          where: {
            slug: experiment.articleSlug,
          },
        });

      if (!article) {
        return NextResponse.json(
          {
            error: "ARTICLE_NOT_FOUND",
          },
          { status: 404 },
        );
      }

      if (
        article.serviceLabel !==
        experiment.appliedServiceLabel
      ) {
        return NextResponse.json(
          {
            error:
              "CTA الحالي اتعدل بعد الـrollout. تم منع Rollback تلقائي حتى لا نمسح تعديل أحدث.",
          },
          { status: 409 },
        );
      }

      const previousServiceLabel =
        experiment.previousServiceLabel;

      const appliedServiceLabel =
        experiment.appliedServiceLabel;

      await prisma.$transaction(async (tx) => {
        await tx.blogArticleRevision.create({
          data: {
            articleId: article.id,
            snapshot: revisionSnapshot(article),
            createdByLabel:
              actor.name || actor.email,
          },
        });

        await tx.blogArticle.update({
          where: { id: article.id },
          data: {
            serviceLabel:
              previousServiceLabel,
            updatedByLabel:
              actor.name || actor.email,
          },
        });

        await tx.croExperiment.update({
          where: { id },
          data: {
            status: "ROLLED_BACK",
            rolledBackAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            actorLabel: actor.name,
            action:
              "CRO_ROLLOUT_ROLLED_BACK",
            oldValue: {
              experimentId: id,
              serviceLabel:
                article.serviceLabel,
            },
            newValue: {
              serviceLabel:
                previousServiceLabel,
            },
          },
        });
      });

      return NextResponse.json({
        ok: true,
      });
    }

    return NextResponse.json(
      {
        error:
          "ACTION_NOT_ALLOWED",
      },
      { status: 400 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message || "FAILED",
      },
      { status: 500 },
    );
  }
}
