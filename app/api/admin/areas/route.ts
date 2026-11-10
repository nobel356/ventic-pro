import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

function clean(value: unknown, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => clean(item, 240))
    .filter(Boolean)
    .slice(0, 12);
}

function cleanFaq(value: unknown): [string, string][] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!Array.isArray(item)) return null;
      const question = clean(item[0], 240);
      const answer = clean(item[1], 800);
      if (!question || !answer) return null;
      return [question, answer] as [string, string];
    })
    .filter((item): item is [string, string] => Boolean(item))
    .slice(0, 10);
}

function seoReady(input: {
  title: string;
  description: string;
  intro: string;
  highlights: string[];
  faq: [string, string][];
}) {
  return (
    input.title.length >= 20 &&
    input.description.length >= 80 &&
    input.intro.length >= 120 &&
    input.highlights.length >= 2 &&
    input.faq.length >= 2
  );
}

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.AREAS_MANAGE);

    const [areas, technicians] = await Promise.all([
      prisma.serviceArea.findMany({
        include: {
          technicians: {
            select: {
              id: true,
              name: true,
              active: true,
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: [
          { governorate: "asc" },
          { area: "asc" },
        ],
      }),
      prisma.user.findMany({
        where: {
          role: "TECHNICIAN",
          active: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      areas: areas.map((item) => {
        const highlights = item.seoHighlights || [];
        const faq = cleanFaq(item.seoFaq);

        return {
          id: item.id,
          governorate: item.governorate,
          area: item.area,
          travelFee: Number(item.travelFee),
          serviceDays: item.serviceDays || "",
          active: item.active,
          technicianIds: item.technicians.map((tech) => tech.id),
          technicianNames: item.technicians.map((tech) => tech.name),
          seoPublished: item.seoPublished,
          seoTitle: item.seoTitle || "",
          seoDescription: item.seoDescription || "",
          seoIntro: item.seoIntro || "",
          seoHighlights: highlights,
          seoFaq: faq,
          seoReady: seoReady({
            title: item.seoTitle || "",
            description: item.seoDescription || "",
            intro: item.seoIntro || "",
            highlights,
            faq,
          }),
        };
      }),
      technicians,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تحميل المناطق" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requirePermission(
      PERMISSIONS.AREAS_MANAGE,
    );

    const body = await req.json();
    const id = clean(body?.id, 120);
    const governorate = clean(body?.governorate, 120);
    const area = clean(body?.area, 120);
    const serviceDays = clean(body?.serviceDays, 240) || null;
    const travelFee = Math.max(0, Number(body?.travelFee || 0));
    const active = body?.active !== false;

    const seoPublished = body?.seoPublished === true;
    const seoTitle = clean(body?.seoTitle, 220) || null;
    const seoDescription = clean(body?.seoDescription, 500) || null;
    const seoIntro = clean(body?.seoIntro, 2000) || null;
    const seoHighlights = cleanList(body?.seoHighlights);
    const seoFaq = cleanFaq(body?.seoFaq);

    const technicianIds: string[] = Array.isArray(body?.technicianIds)
      ? Array.from(
          new Set(
            body.technicianIds
              .map((value: unknown) => clean(value, 120))
              .filter((value: string) => Boolean(value)),
          ),
        )
      : [];

    if (!governorate || !area) {
      return NextResponse.json(
        { error: "المحافظة والمنطقة مطلوبتان" },
        { status: 400 },
      );
    }

    if (
      seoPublished &&
      !seoReady({
        title: seoTitle || "",
        description: seoDescription || "",
        intro: seoIntro || "",
        highlights: seoHighlights,
        faq: seoFaq,
      })
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكن نشر SEO قبل اكتمال المحتوى: عنوان 20+ حرف، وصف 80+، مقدمة 120+، نقطتان محليتان على الأقل، وسؤالان شائعان.",
        },
        { status: 400 },
      );
    }

    const technicianCount = technicianIds.length
      ? await prisma.user.count({
          where: {
            id: { in: technicianIds },
            role: "TECHNICIAN",
            active: true,
          },
        })
      : 0;

    if (technicianCount !== technicianIds.length) {
      return NextResponse.json(
        { error: "يوجد فني غير صالح ضمن الاختيار" },
        { status: 400 },
      );
    }

    const old = id
      ? await prisma.serviceArea.findUnique({
          where: { id },
          include: {
            technicians: {
              select: { id: true, name: true },
            },
          },
        })
      : null;

    const data = {
      governorate,
      area,
      travelFee,
      serviceDays,
      active,
      seoPublished,
      seoTitle,
      seoDescription,
      seoIntro,
      seoHighlights,
      seoFaq,
      technicians: {
        set: technicianIds.map((techId) => ({ id: techId })),
      },
    };

    const saved = id
      ? await prisma.serviceArea.update({
          where: { id },
          data,
          include: {
            technicians: {
              select: { id: true, name: true },
            },
          },
        })
      : await prisma.serviceArea.create({
          data: {
            ...data,
            technicians: {
              connect: technicianIds.map((techId) => ({ id: techId })),
            },
          },
          include: {
            technicians: {
              select: { id: true, name: true },
            },
          },
        });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: id
          ? "SERVICE_AREA_UPDATED"
          : "SERVICE_AREA_CREATED",
        oldValue: old
          ? {
              id: old.id,
              governorate: old.governorate,
              area: old.area,
              travelFee: Number(old.travelFee),
              serviceDays: old.serviceDays,
              active: old.active,
              seoPublished: old.seoPublished,
              seoTitle: old.seoTitle,
              technicians: old.technicians,
            }
          : undefined,
        newValue: {
          id: saved.id,
          governorate: saved.governorate,
          area: saved.area,
          travelFee: Number(saved.travelFee),
          serviceDays: saved.serviceDays,
          active: saved.active,
          seoPublished: saved.seoPublished,
          seoTitle: saved.seoTitle,
          technicians: saved.technicians,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      id: saved.id,
      seoPublished: saved.seoPublished,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "المنطقة مسجلة بالفعل داخل هذه المحافظة" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error?.message || "تعذر حفظ المنطقة" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
