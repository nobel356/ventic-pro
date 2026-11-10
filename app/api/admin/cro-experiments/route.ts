import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import {
  summarizeExperiment,
} from "@/lib/cro-experiments";

const CRO_MIN_UNIQUE_SESSIONS_30D = 100;

function clean(
  value: unknown,
  max: number,
) {
  return String(
    value || "",
  )
    .trim()
    .slice(0, max);
}

async function rows() {
  const experiments =
    await prisma.croExperiment.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

  // V48 decision fields (decision, decisionNote, decidedAt, rolledOutAt, rolledBackAt)
  // are returned automatically because Prisma findMany selects all scalar CroExperiment fields.
  const output = [];

  for (const experiment of experiments) {
    const [
      controlExposures,
      controlClicks,
      variantExposures,
      variantClicks,
      controlOrders,
      variantOrders,
    ] =
      await Promise.all([
        prisma.croEvent.count({
          where: {
            experimentId:
              experiment.id,
            variant:
              "CONTROL",
            eventType:
              "EXPOSURE",
          },
        }),
        prisma.croEvent.count({
          where: {
            experimentId:
              experiment.id,
            variant:
              "CONTROL",
            eventType:
              "CLICK",
          },
        }),
        prisma.croEvent.count({
          where: {
            experimentId:
              experiment.id,
            variant:
              "VARIANT",
            eventType:
              "EXPOSURE",
          },
        }),
        prisma.croEvent.count({
          where: {
            experimentId:
              experiment.id,
            variant:
              "VARIANT",
            eventType:
              "CLICK",
          },
        }),
        prisma.order.count({
          where: {
            attributionContent:
              "cro:" +
              experiment.id +
              ":CONTROL",
          },
        }),
        prisma.order.count({
          where: {
            attributionContent:
              "cro:" +
              experiment.id +
              ":VARIANT",
          },
        }),
      ]);

    output.push({
      ...experiment,
      metrics: {
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
      },
    });
  }

  return output;
}

export async function GET() {
  try {
    await requirePermission(
      PERMISSIONS.BLOG_MANAGE,
    );

    const [
      experiments,
      articles,
    ] =
      await Promise.all([
        rows(),
        prisma.blogArticle.findMany({
          where: {
            status:
              "PUBLISHED",
          },
          select: {
            slug: true,
            title: true,
          },
          orderBy: {
            title: "asc",
          },
        }),
      ]);

    return NextResponse.json({
      experiments,
      articles,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "FAILED",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const actor =
      await requirePermission(
        PERMISSIONS.BLOG_MANAGE,
      );

    const body =
      await request.json();

    const name =
      clean(
        body?.name,
        160,
      );
    const articleSlug =
      clean(
        body?.articleSlug,
        120,
      );
    const controlLabel =
      clean(
        body?.controlLabel,
        100,
      );
    const variantLabel =
      clean(
        body?.variantLabel,
        100,
      );

    if (
      !name ||
      !articleSlug ||
      !controlLabel ||
      !variantLabel
    ) {
      return NextResponse.json(
        {
          error:
            "كل حقول التجربة مطلوبة.",
        },
        { status: 400 },
      );
    }

    if (
      controlLabel ===
      variantLabel
    ) {
      return NextResponse.json(
        {
          error:
            "Control وVariant لازم يكونوا مختلفين.",
        },
        { status: 400 },
      );
    }

    const article =
      await prisma.blogArticle.findFirst({
        where: {
          slug:
            articleSlug,
          status:
            "PUBLISHED",
        },
        select: {
          id: true,
        },
      });

    if (!article) {
      return NextResponse.json(
        {
          error:
            "المقال غير منشور.",
        },
        { status: 400 },
      );
    }

    const saved =
      await prisma.croExperiment.create({
        data: {
          name,
          articleSlug,
          controlLabel,
          variantLabel,
          status: "DRAFT",
          createdByLabel:
            actor.name ||
            actor.email,
        },
      });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel:
          actor.name,
        action:
          "CRO_EXPERIMENT_CREATED",
        newValue: {
          id: saved.id,
          articleSlug,
          name,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      id: saved.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "FAILED",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const actor =
      await requirePermission(
        PERMISSIONS.BLOG_MANAGE,
      );

    const body =
      await request.json();

    const id =
      clean(
        body?.id,
        120,
      );

    const action =
      clean(
        body?.action,
        30,
      );

    const current =
      await prisma.croExperiment.findUnique({
        where: { id },
      });

    if (!current) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (action === "START") {
      const trafficSince =
        new Date(
          Date.now() -
            30 *
              24 *
              60 *
              60 *
              1000,
        );

      const trafficEvents =
        await prisma.blogAnalyticsEvent.findMany({
          where: {
            articleSlug:
              current.articleSlug,
            eventType:
              "PAGE_VIEW",
            createdAt: {
              gte: trafficSince,
            },
          },
          select: {
            sessionHash: true,
          },
        });

      const uniqueSessions =
        new Set(
          trafficEvents.map(
            (event) =>
              event.sessionHash,
          ),
        ).size;

      if (
        uniqueSessions <
        CRO_MIN_UNIQUE_SESSIONS_30D
      ) {
        return NextResponse.json(
          {
            error:
              "CRO_TRAFFIC_NOT_READY",
            message:
              `المقال عنده ${uniqueSessions}/${CRO_MIN_UNIQUE_SESSIONS_30D} Unique Sessions خلال آخر 30 يوم. Start Experiment مقفول لحد ما يكون فيه Traffic كفاية.`,
            uniqueSessions,
            required:
              CRO_MIN_UNIQUE_SESSIONS_30D,
          },
          { status: 409 },
        );
      }
      const conflict =
        await prisma.croExperiment.findFirst({
          where: {
            articleSlug:
              current.articleSlug,
            status:
              "RUNNING",
            id: {
              not: id,
            },
          },
          select: {
            id: true,
          },
        });

      if (conflict) {
        return NextResponse.json(
          {
            error:
              "يوجد Experiment شغال بالفعل على نفس المقال.",
          },
          { status: 409 },
        );
      }

      if (
        current.status !==
        "DRAFT"
      ) {
        return NextResponse.json(
          {
            error:
              "فقط Draft يمكن تشغيلها.",
          },
          { status: 400 },
        );
      }

      await prisma.croExperiment.update({
        where: { id },
        data: {
          status: "RUNNING",
          startedAt:
            new Date(),
        },
      });
    } else if (
      action === "STOP"
    ) {
      if (
        current.status !==
        "RUNNING"
      ) {
        return NextResponse.json(
          {
            error:
              "التجربة ليست Running.",
          },
          { status: 400 },
        );
      }

      await prisma.croExperiment.update({
        where: { id },
        data: {
          status: "STOPPED",
          stoppedAt:
            new Date(),
        },
      });
    } else {
      return NextResponse.json(
        {
          error:
            "ACTION_NOT_ALLOWED",
        },
        { status: 400 },
      );
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel:
          actor.name,
        action:
          action === "START"
            ? "CRO_EXPERIMENT_STARTED"
            : "CRO_EXPERIMENT_STOPPED",
        newValue: {
          id,
          articleSlug:
            current.articleSlug,
        },
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "FAILED",
      },
      { status: 500 },
    );
  }
}
